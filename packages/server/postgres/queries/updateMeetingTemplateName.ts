import getRethink from '../../database/rethinkDriver'
import getPg from '../getPg'

const updateMeetingTemplateName = async (templateId: string, name: string) => {
  const r = await getRethink()
  const now = new Date()
  const pg = getPg()

  await Promise.allSettled([
    r.table('MeetingTemplate').get(templateId).update({name, updatedAt: now}).run(),
    pg.query(`UPDATE "MeetingTemplate" SET name = $1 WHERE id = $2;`, [name, templateId])
  ])
}

export default updateMeetingTemplateName
