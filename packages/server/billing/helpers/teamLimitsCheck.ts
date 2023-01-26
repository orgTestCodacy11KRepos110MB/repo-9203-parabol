import ms from 'ms'
import {Threshold} from 'parabol-client/types/constEnums'
import {r} from 'rethinkdb-ts'
import {RDatum, RValue} from '../../database/stricterR'
import NotificationTeamsLimitExceeded from '../../database/types/NotificationTeamsLimitExceeded'
import scheduleTeamLimitsJobs from '../../database/types/scheduleTeamLimitsJobs'
import {DataLoaderWorker} from '../../graphql/graphql'
import isValid from '../../graphql/isValid'
import publishNotification from '../../graphql/public/mutations/helpers/publishNotification'
import getPg from '../../postgres/getPg'
import {appendUserFeatureFlagsQuery} from '../../postgres/queries/generated/appendUserFeatureFlagsQuery'
import sendTeamsLimitEmail from './sendTeamsLimitEmail'

// Uncomment for easier testing
// const enum Threshold {
//   MAX_STARTER_TIER_TEAMS = 0,
//   MIN_STICKY_TEAM_MEETING_ATTENDEES = 1,
//   MIN_STICKY_TEAM_MEETINGS = 1,
//   STARTER_TIER_LOCK_AFTER_DAYS = 0
// }

const getBillingLeaders = async (orgId: string, dataLoader: DataLoaderWorker) => {
  const billingLeaderIds = (await r
    .table('OrganizationUser')
    .getAll(orgId, {index: 'orgId'})
    .filter({removedAt: null, role: 'BILLING_LEADER'})
    .coerceTo('array')('userId')
    .run()) as unknown as string[]

  return (await dataLoader.get('users').loadMany(billingLeaderIds)).filter(isValid)
}

const enableUsageStats = async (userIds: string[], orgId: string) => {
  await r
    .table('OrganizationUser')
    .getAll(r.args(userIds), {index: 'userId'})
    .filter({orgId})
    .update({suggestedTier: 'team'})
    .run()

  await appendUserFeatureFlagsQuery.run({ids: userIds, flag: 'insights'}, getPg())
}

const sendWebsiteNotifications = async (
  orgId: string,
  userIds: string[],
  dataLoader: DataLoaderWorker
) => {
  const operationId = dataLoader.share()
  const subOptions = {operationId}
  const notificationsToInsert = userIds.map((userId) => {
    return new NotificationTeamsLimitExceeded({
      userId,
      orgId
    })
  })

  await r.table('Notification').insert(notificationsToInsert).run()

  notificationsToInsert.forEach((notification) => {
    publishNotification(notification, subOptions)
  })
}

// Warning: the function might be expensive
const isLimitExceeded = async (orgId: string, dataLoader: DataLoaderWorker) => {
  const teams = await dataLoader.get('teamsByOrgIds').load(orgId)
  const teamIds = teams.map(({id}) => id)

  if (teamIds.length <= Threshold.MAX_STARTER_TIER_TEAMS) {
    return false
  }

  // Sticky team is the team that completed 3 meetings with more than 1 attendee
  // and have had at least 1 meeting in the last 30 days
  // Warning: the query is very expensive
  return r
    .table('NewMeeting')
    .getAll(r.args(teamIds), {index: 'teamId'})
    .filter((row: RDatum) => row('endedAt').default(null).ne(null))('id')
    .coerceTo('array')
    .distinct()
    .do((endedMeetingIds: RValue) => {
      return r
        .db('actionDevelopment')
        .table('MeetingMember')
        .getAll(r.args(endedMeetingIds), {index: 'meetingId'})
        .group('teamId', 'meetingId')
        .count()
        .ungroup()
        .map((row) => ({
          teamId: row('group')(0),
          meetingId: row('group')(1),
          meetingMembers: row('reduction')
        }))
        .filter((row: RDatum) =>
          row('meetingMembers').ge(Threshold.MIN_STICKY_TEAM_MEETING_ATTENDEES)
        )
        .group('teamId')
        .ungroup()
        .filter((row) => row('reduction').count().ge(Threshold.MIN_STICKY_TEAM_MEETINGS))
        .count()
        .gt(Threshold.MAX_STARTER_TIER_TEAMS)
    })
    .run()
}

// Warning: the function might be expensive
export const maybeRemoveRestrictions = async (orgId: string, dataLoader: DataLoaderWorker) => {
  const organization = await dataLoader.get('organizations').load(orgId)

  if (!organization.tierLimitExceededAt) {
    return
  }

  if (!(await isLimitExceeded(orgId, dataLoader))) {
    await r
      .table('Organization')
      .get(orgId)
      .update({
        tierLimitExceededAt: null,
        scheduledLockAt: null,
        lockedAt: null,
        updatedAt: new Date()
      })
      .run()
    dataLoader.get('organizations').clear(orgId)
  }
}

// Warning: the function might be expensive
export const checkTeamsLimit = async (orgId: string, dataLoader: DataLoaderWorker) => {
  const organization = await dataLoader.get('organizations').load(orgId)
  const {tierLimitExceededAt, tier, featureFlags, name: orgName} = organization

  if (!featureFlags?.includes('teamsLimit')) return

  if (tierLimitExceededAt || tier !== 'starter') return

  if (!(await isLimitExceeded(orgId, dataLoader))) return

  const now = new Date()
  const scheduledLockAt = new Date(now.getTime() + ms(`${Threshold.STARTER_TIER_LOCK_AFTER_DAYS}d`))

  await r
    .table('Organization')
    .get(orgId)
    .update({
      tierLimitExceededAt: now,
      scheduledLockAt,
      updatedAt: now
    })
    .run()
  dataLoader.get('organizations').clear(orgId)

  const billingLeaders = await getBillingLeaders(orgId, dataLoader)
  const billingLeadersIds = billingLeaders.map((billingLeader) => billingLeader.id)

  if (organization.activeDomain) {
    await enableUsageStats(billingLeadersIds, orgId)
    await Promise.all([
      sendWebsiteNotifications(orgId, billingLeadersIds, dataLoader),
      billingLeaders.map((billingLeader) =>
        sendTeamsLimitEmail({
          user: billingLeader,
          orgId,
          orgName,
          emailType: 'thirtyDayWarning'
        })
      ),
      scheduleTeamLimitsJobs(scheduledLockAt, orgId)
    ])
  }
}
