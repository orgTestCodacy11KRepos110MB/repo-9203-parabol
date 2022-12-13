import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString
} from 'graphql'
import ms from 'ms'
import {RateLimitError} from 'parabol-client/utils/AtlassianManager'
import AtlassianIntegrationId from '../../../client/shared/gqlIds/AtlassianIntegrationId'
import {AtlassianAuth} from '../../postgres/queries/getAtlassianAuthByUserIdTeamId'
import updateJiraSearchQueries from '../../postgres/queries/updateJiraSearchQueries'
import AtlassianServerManager from '../../utils/AtlassianServerManager'
import {getUserId} from '../../utils/authorization'
import {GQLContext} from '../graphql'
import GraphQLISO8601Type from './GraphQLISO8601Type'
import JiraRemoteProject from './JiraRemoteProject'
import JiraSearchQuery from './JiraSearchQuery'

const AtlassianIntegration = new GraphQLObjectType<AtlassianAuth, GQLContext>({
  name: 'AtlassianIntegration',
  description: 'The atlassian auth + integration helpers for a specific team member',
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'Composite key in atlassiani:teamId:userId format',
      resolve: ({teamId, userId}: {teamId: string; userId: string}) =>
        AtlassianIntegrationId.join(teamId, userId)
    },
    isActive: {
      description: 'true if the auth is valid, else false',
      type: new GraphQLNonNull(GraphQLBoolean),
      resolve: ({accessToken}) => !!accessToken
    },
    accessToken: {
      description:
        'The access token to atlassian, useful for 1 hour. null if no access token available or the viewer is not the user',
      type: GraphQLID,
      resolve: async ({accessToken, userId}, _args: unknown, {authToken}) => {
        const viewerId = getUserId(authToken)
        return viewerId === userId ? accessToken : null
      }
    },
    accountId: {
      type: new GraphQLNonNull(GraphQLID),
      description: '*The atlassian account ID'
    },
    cloudIds: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
      description: 'The atlassian cloud IDs that the user has granted'
    },
    createdAt: {
      type: new GraphQLNonNull(GraphQLISO8601Type),
      description: 'The timestamp the provider was created'
    },
    teamId: {
      type: new GraphQLNonNull(GraphQLID),
      description: '*The team that the token is linked to'
    },
    updatedAt: {
      type: new GraphQLNonNull(GraphQLISO8601Type),
      description: 'The timestamp the token was updated at'
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The user that the access token is attached to'
    },
    projects: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(JiraRemoteProject))),
      description:
        'A list of projects accessible by this team member. empty if viewer is not the user',
      resolve: ({teamId, userId}: AtlassianAuth, _args: unknown, {authToken, dataLoader}) => {
        const viewerId = getUserId(authToken)
        if (viewerId !== userId) return []
        return dataLoader.get('allJiraProjects').load({teamId, userId})
      }
    },
    jiraFields: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))),
      description: 'The list of field names that can be used as a ',
      args: {
        cloudId: {
          type: new GraphQLNonNull(GraphQLID),
          description: 'Filter the fields to single cloudId'
        }
      },
      resolve: async ({accessToken}, {cloudId}) => {
        const manager = new AtlassianServerManager(accessToken)
        const fields = await manager.getFields(cloudId)
        if (fields instanceof Error || fields instanceof RateLimitError) return []
        const VALID_TYPES = ['string', 'number']
        const INVALID_WORDS = ['color', 'name', 'description', 'environment']
        const uniqueFieldNames = Array.from(
          new Set(
            fields
              .filter((field) => {
                if (!VALID_TYPES.includes(field.schema?.type)) return false
                const fieldName = field.name.toLowerCase()
                for (let i = 0; i < INVALID_WORDS.length; i++) {
                  if (fieldName.includes(INVALID_WORDS[i]!)) return false
                }
                return true
              })
              .map((field) => field.name)
              .sort()
          )
        )
        return uniqueFieldNames
      }
    },
    jiraSearchQueries: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(JiraSearchQuery))),
      description:
        'the list of suggested search queries, sorted by most recent. Guaranteed to be < 60 days old',
      resolve: async ({teamId, userId, jiraSearchQueries}) => {
        const expirationThresh = ms('60d')
        const thresh = new Date(Date.now() - expirationThresh)
        const searchQueries = jiraSearchQueries || []
        const unexpiredQueries = searchQueries.filter((query) => query.lastUsedAt > thresh)
        if (unexpiredQueries.length < searchQueries.length) {
          await updateJiraSearchQueries({
            jiraSearchQueries: searchQueries,
            teamId,
            userId
          })
        }
        return unexpiredQueries
      }
    }
  })
})

export default AtlassianIntegration
