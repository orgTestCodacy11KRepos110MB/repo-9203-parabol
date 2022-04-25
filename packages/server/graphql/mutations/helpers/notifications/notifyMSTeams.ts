import * as AdaptiveCards from 'adaptivecards'
import makeAppURL from 'parabol-client/utils/makeAppURL'
import appOrigin from '../../../../appOrigin'
import {MSTeamsNotificationEventEnum as EventEnum} from '../../../../database/types/MSTeamsNotification'
import {IntegrationProviderMSTeams} from '../../../../postgres/queries/getIntegrationProvidersByIds'
import {Team} from '../../../../postgres/queries/getTeamsByIds'
import {AnyMeeting} from '../../../../postgres/types/Meeting'
import MSTeamsServerManager from '../../../../utils/MSTeamsServerManager'
import segmentIo from '../../../../utils/segmentIo'
import sendToSentry from '../../../../utils/sendToSentry'
import {DataLoaderWorker} from '../../../graphql'
import getSummaryText from './getSummaryText'

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
  const urlLink = `https:/prbl.in/${meetingId}`

  const card = new AdaptiveCards.AdaptiveCard()
  card.version = new AdaptiveCards.Version(1.2, 0)

  const meetingTitle = 'Meeting Started 👋'
  const titleTextBlock = GenerateACMeetingTitle(meetingTitle)
  card.addItem(titleTextBlock)

  const meetingDetailColumnSet = GenerateACMeetingAndTeamsDetails(team, meeting)
  card.addItem(meetingDetailColumnSet)

  const meetingLinkColumnSet = new AdaptiveCards.ColumnSet()
  meetingLinkColumnSet.spacing = AdaptiveCards.Spacing.ExtraLarge
  const meetingLinkColumn = new AdaptiveCards.Column()
  meetingLinkColumn.width = 'stretch'
  const meetingLinkHeaderTextBlock = new AdaptiveCards.TextBlock('Link: ')
  meetingLinkHeaderTextBlock.wrap = true
  meetingLinkHeaderTextBlock.weight = AdaptiveCards.TextWeight.Bolder
  const meetingLinkTextBlock = new AdaptiveCards.TextBlock()
  meetingLinkTextBlock.text = urlLink
  meetingLinkTextBlock.color = AdaptiveCards.TextColor.Accent
  meetingLinkTextBlock.size = AdaptiveCards.TextSize.Small
  meetingLinkTextBlock.wrap = true
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

  card.addItem(meetingLinkColumnSet)

  const adaptivecard = JSON.stringify(card.toJSON())
  const attachments = `{"type":"message", "attachments":[{"contentType":"application/vnd.microsoft.card.adaptive","contentUrl":null, "content": ${adaptivecard}}]}`

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

  const searchParams = {
    utm_source: 'MS Teams summary',
    utm_medium: 'product',
    utm_campaign: 'after-meeting'
  }
  const options = {searchParams}
  const summaryUrl = makeAppURL(appOrigin, `new-summary/${meetingId}`, options)
  const meetingUrl = makeAppURL(appOrigin, `meet/${meetingId}`, options)

  const card = new AdaptiveCards.AdaptiveCard()
  card.version = new AdaptiveCards.Version(1.2, 0)

  const meetingTitle = 'Meeting Ended 🎉'
  const titleTextBlock = GenerateACMeetingTitle(meetingTitle)
  card.addItem(titleTextBlock)

  const meetingDetailColumnSet = GenerateACMeetingAndTeamsDetails(team, meeting)
  card.addItem(meetingDetailColumnSet)

  const summaryColumnSet = new AdaptiveCards.ColumnSet()
  summaryColumnSet.spacing = AdaptiveCards.Spacing.ExtraLarge
  const summaryColumn = new AdaptiveCards.Column()
  summaryColumn.width = 'stretch'
  const summaryTextBlock = new AdaptiveCards.TextBlock()
  summaryTextBlock.text = getSummaryText(meeting)
  summaryTextBlock.wrap = true
  summaryColumn.addItem(summaryTextBlock)
  summaryColumnSet.addColumn(summaryColumn)
  card.addItem(summaryColumnSet)

  const meetingEndedActionsColumnSet = new AdaptiveCards.ColumnSet()
  meetingEndedActionsColumnSet.spacing = AdaptiveCards.Spacing.ExtraLarge
  const meetingEndedDiscussionColumn = new AdaptiveCards.Column()
  meetingEndedDiscussionColumn.width = 'auto'
  const meetingEndedReviewColumn = new AdaptiveCards.Column()
  meetingEndedReviewColumn.width = 'auto'

  const meetingEndedDiscussionActionSet = new AdaptiveCards.ActionSet()
  const meetingEndedDiscussionAction = new AdaptiveCards.OpenUrlAction()
  meetingEndedDiscussionAction.title = 'See discussion'
  meetingEndedDiscussionAction.url = meetingUrl
  meetingEndedDiscussionAction.id = 'joinMeeting'

  meetingEndedDiscussionActionSet.addAction(meetingEndedDiscussionAction)
  meetingEndedDiscussionColumn.addItem(meetingEndedDiscussionActionSet)

  const meetingEndedReviewActionSet = new AdaptiveCards.ActionSet()
  const meetingEndedReviewAction = new AdaptiveCards.OpenUrlAction()
  meetingEndedReviewAction.title = 'Review summary'
  meetingEndedReviewAction.url = summaryUrl
  meetingEndedReviewAction.id = 'joinMeeting'

  meetingEndedDiscussionActionSet.addAction(meetingEndedReviewAction)
  meetingEndedDiscussionColumn.addItem(meetingEndedReviewActionSet)

  meetingEndedActionsColumnSet.addColumn(meetingEndedDiscussionColumn)
  meetingEndedActionsColumnSet.addColumn(meetingEndedReviewColumn)

  card.addItem(meetingEndedActionsColumnSet)

  const adaptivecard = JSON.stringify(card.toJSON())
  const attachments = `{"type":"message", "attachments":[{"contentType":"application/vnd.microsoft.card.adaptive","contentUrl":null, "content": ${adaptivecard}}]}`

  return notifyMSTeams('meetingEnd', webhookUrl, facilitatorUserId, teamId, attachments)
}
function GenerateACMeetingTitle(meetingTitle: string) {
  const titleTextBlock = new AdaptiveCards.TextBlock(meetingTitle)
  titleTextBlock.wrap = true
  titleTextBlock.size = AdaptiveCards.TextSize.Large
  titleTextBlock.weight = AdaptiveCards.TextWeight.Bolder
  return titleTextBlock
}

function GenerateACMeetingAndTeamsDetails(team: Team, meeting: AnyMeeting) {
  const meetingDetailColumnSet = new AdaptiveCards.ColumnSet()
  const teamDetailColumn = new AdaptiveCards.Column()
  teamDetailColumn.width = 'stretch'
  const teamHeaderTextBlock = new AdaptiveCards.TextBlock('Team: ')
  teamHeaderTextBlock.wrap = true
  teamHeaderTextBlock.weight = AdaptiveCards.TextWeight.Bolder
  const teamValueTextBlock = new AdaptiveCards.TextBlock()
  teamValueTextBlock.text = team.name
  teamValueTextBlock.wrap = true

  teamDetailColumn.addItem(teamHeaderTextBlock)
  teamDetailColumn.addItem(teamValueTextBlock)

  const meetingDetailColumn = new AdaptiveCards.Column()
  meetingDetailColumn.width = 'stretch'
  const meetingHeaderTextBlock = new AdaptiveCards.TextBlock('Meeting: ')
  meetingHeaderTextBlock.wrap = true
  meetingHeaderTextBlock.weight = AdaptiveCards.TextWeight.Bolder
  const meetingValueTextBlock = new AdaptiveCards.TextBlock()
  meetingValueTextBlock.text = meeting.name
  meetingValueTextBlock.wrap = true

  meetingDetailColumn.addItem(meetingHeaderTextBlock)
  meetingDetailColumn.addItem(meetingValueTextBlock)

  meetingDetailColumnSet.addColumn(teamDetailColumn)
  meetingDetailColumnSet.addColumn(meetingDetailColumn)
  return meetingDetailColumnSet
}
