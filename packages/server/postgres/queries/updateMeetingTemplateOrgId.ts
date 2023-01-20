import getRethink from '../../database/rethinkDriver'
import getPg from '../getPg'

const updateMeetingTemplateOrgId = async (oldOrgId: string, newOrgId: string) => {
  const r = await getRethink()
  const now = new Date()
  const pg = getPg()
  const rPromise = r
    .table('MeetingTemplate')
    .getAll(oldOrgId, {index: 'orgId'})
    .update({
      orgId: newOrgId,
      updatedAt: now
    })
    .run()

  try {
    await pg.query(`UPDATE "MeetingTemplate" SET "orgId" = $1 WHERE "orgId" = $2;`, [
      newOrgId,
      oldOrgId
    ])
  } catch {}

  await rPromise
}

export default updateMeetingTemplateOrgId
