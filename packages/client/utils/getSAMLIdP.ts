import graphql from 'babel-plugin-relay/macro'
import Atmosphere from '../Atmosphere'
import {getSAMLIdPQuery, getSAMLIdPQueryVariables} from '../__generated__/getSAMLIdPQuery.graphql'

const query = graphql`
  query getSAMLIdPQuery($email: ID!, $isInvited: Boolean) {
    SAMLIdP(email: $email, isInvited: $isInvited)
  }
`

const getSAMLIdP = async (atmosphere: Atmosphere, variables: getSAMLIdPQueryVariables) => {
  const res = await atmosphere.fetchQuery<getSAMLIdPQuery>(query, variables)
  return res?.SAMLIdP ?? null
}

export default getSAMLIdP
