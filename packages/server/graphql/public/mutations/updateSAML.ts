import * as samlify from 'samlify'
import {v4 as uuid} from 'uuid'
import zlib from 'zlib'
import getRethink from '../../../database/rethinkDriver'
import {MutationResolvers} from '../resolverTypes'

const getURLWithSAMLRequestParam = (destination: string, slug: string) => {
  const template = `
  <samlp:AuthnRequest
      xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
      xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_${uuid()}" Version="2.0" IssueInstant="${new Date().toISOString()}" Destination="${destination}" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" AssertionConsumerServiceURL="https://${
    process.env.HOST
  }/saml/${slug}">
  <saml:Issuer>https://${process.env.HOST}/saml-metadata/${slug}</saml:Issuer>
      <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="false"/>
  </samlp:AuthnRequest>
  `
  const SAMLRequest = zlib.deflateRawSync(template).toString('base64')
  const url = new URL(destination)
  // appending a SAMLRequest that is _not_ URI encoded
  url.searchParams.append('SAMLRequest', SAMLRequest)
  // calling toString will URI encode everything for us!
  return url.toString()
}

const getSignOnURL = (metadata: string | null | undefined, slugName: string) => {
  if (!metadata) return undefined
  const idp = samlify.IdentityProvider({metadata})
  const {singleSignOnService} = idp.entityMeta.meta
  const [fallbackKey] = Object.keys(singleSignOnService)
  if (!fallbackKey) {
    return new Error('Invalid metadata. Does not contain sign on URL')
  }
  const postKey = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST'
  const inputURL = singleSignOnService[postKey] || singleSignOnService[fallbackKey]
  try {
    new URL(inputURL)
  } catch (e) {
    return new Error(`Invalid Sign on URL: ${inputURL}`)
  }
  return getURLWithSAMLRequestParam(inputURL, slugName)
}

const updateSAML: MutationResolvers['updateSAML'] = async (_source, {orgId, metadata}, {}) => {
  const r = await getRethink()

  // RESOLUTION
  const samlRecord = await r
    .table('SAML')
    .getAll(orgId, {index: 'orgId'})
    .limit(1)
    .nth(0)
    .default(null)
    .run()

  if (!samlRecord) {
    return {error: {message: 'SAML has not been created in Parabol yet.'}}
  }
  const url = !metadata ? undefined : getSignOnURL(metadata, samlRecord.id)
  if (url instanceof Error) return {error: {message: url.message}}
  await r
    .table('SAML')
    .get(samlRecord.id)
    .update({
      url,
      metadata: undefined
    })
    .run()

  return {success: true}
}

export default updateSAML
