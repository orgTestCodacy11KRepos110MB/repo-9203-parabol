import {MSTeamsNotificationEventEnum as EventEnum} from '../../../../database/types/MSTeamsNotification'
import {IntegrationProviderMSTeams} from '../../../../postgres/queries/getIntegrationProvidersByIds'
import MSTeamsServerManager from '../../../../utils/MSTeamsServerManager'
import segmentIo from '../../../../utils/segmentIo'
import sendToSentry from '../../../../utils/sendToSentry'
import {DataLoaderWorker} from '../../../graphql'

const notifyMSTeams = async (
  event: EventEnum,
  webhookUrl: string,
  userId: string,
  teamId: string,
  textOrAttachmentsArray: string | unknown[]
  // notificationText?: string
) => {
  const manager = new MSTeamsServerManager(webhookUrl)
  const result = await manager.postMessage(textOrAttachmentsArray)
  if (result instanceof Error) {
    sendToSentry(result, {userId, tags: {teamId, event, webhookUrl}})
    return result
  }
  segmentIo.track({
    userId,
    event: 'MS Teams notification sent',
    properties: {
      teamId,
      notificationEvent: event
    }
  })

  return result
}
export const startMSTeamsMeeting = async (
  meetingId: string,
  teamId: string,
  dataLoader: DataLoaderWorker
) => {
  const meeting = await dataLoader.get('newMeetings').load(meetingId)
  const {facilitatorUserId} = meeting

  const [MSTeamsProvider, team] = await Promise.all([
    dataLoader
      .get('bestTeamIntegrationProviders')
      .load({service: 'msTeams', teamId, userId: facilitatorUserId}),
    dataLoader.get('teams').load(teamId)
  ])
  if (!MSTeamsProvider || !team) return
  const {webhookUrl} = MSTeamsProvider as IntegrationProviderMSTeams

  // const searchParams = {
  //   utm_source: 'MS Teams meeting start',
  //   utm_medium: 'product',
  //   utm_campaign: 'invitations'
  // }
  // const options = {searchParams}
  // const meetingUrl = makeAppURL(appOrigin, `meet/${meetingId}`, options)
  const attachments =
    '{"@context": "https://schema.org/extensions", "@type": "MessageCard", "themeColor": "0072C6", "title": "Parabol Meeting Started", "text": "Click **Here** to join the meeting!", "potentialAction": [ { "@type": "ActionCard", "name": "Send Feedback", "inputs": [ { "@type": "TextInput", "id": "feedback", "isMultiline": true, "title": "Let us know what you think about Actionable Messages" } ], "actions": [ { "@type": "HttpPOST", "name": "Send Feedback", "isPrimary": true, "target": "http://..." } ] }, { "@type": "OpenUri", "name": "Learn More", "targets": [ { "os": "default", "uri": "https://docs.microsoft.com/outlook/actionable-messages" } ] } ]}'
  // makeFieldsAttachment(
  //   [
  //     {
  //       short: true,
  //       title: 'Team',
  //       value: team.name
  //     },
  //     {
  //       short: true,
  //       title: 'Meeting',
  //       value: meeting.name
  //     },
  //     {
  //       short: false,
  //       value: makeHackedFieldButtonValue({label: 'Join meeting', link: meetingUrl})
  //     }
  //   ],
  //   {
  //     fallback: `Meeting started, join: ${meetingUrl}`,
  //     title: 'Meeting started 👋',
  //     title_link: meetingUrl
  //   }
  // )
  console.log('teams notification sent')

  return notifyMSTeams('meetingStart', webhookUrl, facilitatorUserId, teamId, attachments)
}

export const endMSTeamsMeeting = async (
  meetingId: string,
  teamId: string,
  dataLoader: DataLoaderWorker
) => {
  const meeting = await dataLoader.get('newMeetings').load(meetingId)
  const {facilitatorUserId} = meeting
  const [MSTeamsProvider, team] = await Promise.all([
    dataLoader
      .get('bestTeamIntegrationProviders')
      .load({service: 'msTeams', teamId, userId: facilitatorUserId}),
    dataLoader.get('teams').load(teamId)
  ])
  if (!MSTeamsProvider || !team) return
  const {webhookUrl} = MSTeamsProvider as IntegrationProviderMSTeams
  // const meetingUrl = makeAppURL(appOrigin, `meet/${meetingId}`)
  const attachments =
    '{"@context": "https://schema.org/extensions", "@type": "MessageCard", "themeColor": "0072C6", "title": "Parabol Meeting Ended", "text": "Click **Here** to join the meeting!", "potentialAction": [ { "@type": "ActionCard", "name": "Send Feedback", "inputs": [ { "@type": "TextInput", "id": "feedback", "isMultiline": true, "title": "Let us know what you think about Actionable Messages" } ], "actions": [ { "@type": "HttpPOST", "name": "Send Feedback", "isPrimary": true, "target": "http://..." } ] }, { "@type": "OpenUri", "name": "Learn More", "targets": [ { "os": "default", "uri": "https://docs.microsoft.com/outlook/actionable-messages" } ] } ]}'
  // makeFieldsAttachment(
  //   [
  //     {
  //       short: true,
  //       title: 'Team',
  //       value: team.name
  //     },
  //     {
  //       short: true,
  //       title: 'Meeting',
  //       value: meeting.name
  //     },
  //     {
  //       short: false,
  //       title: 'Summary',
  //       value: summaryText
  //     },
  //     ...makeEndMeetingButtons(meeting)
  //   ],
  //   {
  //     fallback: `Meeting completed, join: ${meetingUrl}`,
  //     title: 'Meeting completed 🎉',
  //     title_link: meetingUrl
  //   }
  // )

  console.log('meeting ended notification sent')
  return notifyMSTeams('meetingEnd', webhookUrl, facilitatorUserId, teamId, attachments)
}
