import {GraphQLID, GraphQLNonNull, GraphQLObjectType, GraphQLString} from 'graphql'
import {getUserId} from '../../utils/authorization'
import {GQLContext} from '../graphql'
import TeamInvitationErrorEnum from './TeamInvitationErrorEnum'
import TeamInvitationPayload from './TeamInvitationPayload'

const MassInvitationPayload = new GraphQLObjectType<any, GQLContext>({
  name: 'MassInvitationPayload',
  fields: () => ({
    errorType: {
      type: TeamInvitationErrorEnum
    },
    inviterName: {
      type: GraphQLString,
      description:
        'The name of the person that sent the invitation, present if errorType is expired'
    },
    teamId: {
      type: GraphQLID,
      description: 'The teamId from the token'
    },
    teamName: {
      type: GraphQLString,
      description: 'name of the inviting team, present if invitation exists'
    },
    teamInvitation: {
      type: new GraphQLNonNull(TeamInvitationPayload),
      // Check if user viewing the link has team invitation already, handle expired links
      resolve: async ({teamId}: {teamId: string}, {}, {authToken, dataLoader}: GQLContext) => {
        const userId = getUserId(authToken)

        if (!userId) {
          return null
        }

        const user = (await dataLoader.get('users').load(userId))!
        const {email} = user

        const teamInvitations = teamId
          ? await dataLoader.get('teamInvitationsByTeamId').load(teamId)
          : null
        if (!teamInvitations) return {teamId}
        const teamInvitation = teamInvitations.find((invitation) => invitation.email === email)
        return {teamInvitation, teamId}
      }
    }
    // meetingType: {
    // type: MeetingTypeEnum
    // }
  })
})

export default MassInvitationPayload
