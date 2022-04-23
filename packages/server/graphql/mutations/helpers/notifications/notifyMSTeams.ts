import * as AdaptiveCards from 'adaptivecards'
import makeAppURL from 'parabol-client/utils/makeAppURL'
import appOrigin from '../../../../appOrigin'
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
  textOrAttachmentsArray: string
) => {
  const manager = new MSTeamsServerManager(webhookUrl)
  const result = await manager.post(textOrAttachmentsArray)
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

  const searchParams = {
    utm_source: 'MS Teams meeting start',
    utm_medium: 'product',
    utm_campaign: 'invitations'
  }
  const options = {searchParams}
  const meetingUrl = makeAppURL(appOrigin, `meet/${meetingId}`, options)

  const card = new AdaptiveCards.AdaptiveCard()
  card.version = new AdaptiveCards.Version(1.2, 0)

  const titleTextBlock = new AdaptiveCards.TextBlock('Meeting Started 👋')
  titleTextBlock.wrap = true
  // titleTextBlock.size = 'large'
  // titleTextBlock.weight  = 'bolder'
  card.addItem(titleTextBlock)

  const meetingDetailColumnSet = new AdaptiveCards.ColumnSet()
  const teamDetailColumn = new AdaptiveCards.Column()
  teamDetailColumn.width = 'stretch'

  const teamHeaderTextBlock = new AdaptiveCards.TextBlock('Team: ')
  teamHeaderTextBlock.wrap = true
  // teamHeaderTextBlock.weight = 'bolder'

  const teamValueTextBlock = new AdaptiveCards.TextBlock()
  teamValueTextBlock.text = team.name
  teamValueTextBlock.wrap = true

  teamDetailColumn.addItem(teamHeaderTextBlock)
  teamDetailColumn.addItem(teamValueTextBlock)

  const meetingDetailColumn = new AdaptiveCards.Column()
  meetingDetailColumn.width = 'stretch'
  const meetingHeaderTextBlock = new AdaptiveCards.TextBlock('Meeting: ')
  meetingHeaderTextBlock.wrap = true
  // meetingHeaderTextBlock.weight = 'bolder'

  const meetingValueTextBlock = new AdaptiveCards.TextBlock()
  meetingValueTextBlock.text = meeting.name
  meetingValueTextBlock.wrap = true

  meetingDetailColumn.addItem(meetingHeaderTextBlock)
  meetingDetailColumn.addItem(meetingValueTextBlock)

  meetingDetailColumnSet.addColumn(teamDetailColumn)
  meetingDetailColumnSet.addColumn(meetingDetailColumn)
  card.addItem(meetingDetailColumnSet)

  const meetingLinkColumnSet = new AdaptiveCards.ColumnSet()
  // meetingLinkColumnSet.spacing = 'extraLarge'
  const meetingLinkColumn = new AdaptiveCards.Column()
  meetingLinkColumn.width = 'stretch'
  const meetingLinkHeaderTextBlock = new AdaptiveCards.TextBlock('Link: ')
  meetingLinkHeaderTextBlock.wrap = true
  // meetingLinkHeaderTextBlock.weight= "bolder"
  const meetingLinkTextBlock = new AdaptiveCards.TextBlock()
  meetingLinkTextBlock.text = meetingUrl
  meetingLinkTextBlock.wrap = true
  // meetingLinkTextBlock.size = "small"
  // meetingLinkTextBlock.color = "accent"
  const joinMeetingActionSet = new AdaptiveCards.ActionSet()
  const joinMeetingAction = new AdaptiveCards.OpenUrlAction()
  joinMeetingAction.title = 'Join Meeting'
  joinMeetingAction.url = meetingUrl
  joinMeetingAction.id = 'joinMeeting'

  joinMeetingActionSet.addAction(joinMeetingAction)

  meetingLinkColumn.addItem(meetingLinkHeaderTextBlock)
  meetingLinkColumn.addItem(meetingLinkTextBlock)
  meetingLinkColumn.addItem(joinMeetingActionSet)

  meetingLinkColumnSet.addColumn(meetingLinkColumn)

  const attachments =
    '{"@context": "https://schema.org/extensions", "@type": "MessageCard", "themeColor": "0072C6", "title": "Meeting Started 👋", "text": "Click **Here** to join the meeting!", "potentialAction": [ { "@type": "ActionCard", "name": "Send Feedback", "inputs": [ { "@type": "TextInput", "id": "feedback", "isMultiline": true, "title": "Let us know what you think about Actionable Messages" } ], "actions": [ { "@type": "HttpPOST", "name": "Send Feedback", "isPrimary": true, "target": "http://..." } ] }, { "@type": "OpenUri", "name": "Learn More", "targets": [ { "os": "default", "uri": "https://docs.microsoft.com/outlook/actionable-messages" } ] } ]}'

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

  const card = new AdaptiveCards.AdaptiveCard()
  card.version = new AdaptiveCards.Version(1.2, 0)

  const titleTextBlock = new AdaptiveCards.TextBlock('Meeting Started 👋')
  titleTextBlock.wrap = true
  // titleTextBlock.size = 'large'
  // titleTextBlock.weight  = 'bolder'
  card.addItem(titleTextBlock)

  const meetingDetailColumnSet = new AdaptiveCards.ColumnSet()
  const teamDetailColumn = new AdaptiveCards.Column()
  teamDetailColumn.width = 'stretch'

  const teamHeaderTextBlock = new AdaptiveCards.TextBlock('Team: ')
  teamHeaderTextBlock.wrap = true
  // teamHeaderTextBlock.weight = 'bolder'

  const teamValueTextBlock = new AdaptiveCards.TextBlock()
  teamValueTextBlock.text = team.name
  teamValueTextBlock.wrap = true

  teamDetailColumn.addItem(teamHeaderTextBlock)
  teamDetailColumn.addItem(teamValueTextBlock)

  const meetingDetailColumn = new AdaptiveCards.Column()
  meetingDetailColumn.width = 'stretch'
  const meetingHeaderTextBlock = new AdaptiveCards.TextBlock('Meeting: ')
  meetingHeaderTextBlock.wrap = true
  // meetingHeaderTextBlock.weight = 'bolder'

  const meetingValueTextBlock = new AdaptiveCards.TextBlock()
  meetingValueTextBlock.text = meeting.name
  meetingValueTextBlock.wrap = true

  meetingDetailColumn.addItem(meetingHeaderTextBlock)
  meetingDetailColumn.addItem(meetingValueTextBlock)

  meetingDetailColumnSet.addColumn(teamDetailColumn)
  meetingDetailColumnSet.addColumn(meetingDetailColumn)
  card.addItem(meetingDetailColumnSet)

  // let descriptionColumnSet = new AdaptiveCards.ColumnSet()
  // descriptionColumnSet.spacing = "extraLarge"

  const attachments =
    '{"@context": "https://schema.org/extensions", "@type": "MessageCard", "themeColor": "0072C6", "title": "Meeting Ended 👋", "text": "Click **Here** to join the meeting!", "potentialAction": [ { "@type": "ActionCard", "name": "Send Feedback", "inputs": [ { "@type": "TextInput", "id": "feedback", "isMultiline": true, "title": "Let us know what you think about Actionable Messages" } ], "actions": [ { "@type": "HttpPOST", "name": "Send Feedback", "isPrimary": true, "target": "http://..." } ] }, { "@type": "OpenUri", "name": "Learn More", "targets": [ { "os": "default", "uri": "https://docs.microsoft.com/outlook/actionable-messages" } ] } ]}'

  console.log('meeting ended notification sent')
  return notifyMSTeams('meetingEnd', webhookUrl, facilitatorUserId, teamId, attachments)
}
