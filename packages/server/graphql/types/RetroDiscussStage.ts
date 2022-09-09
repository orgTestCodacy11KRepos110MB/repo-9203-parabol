import {GraphQLFloat, GraphQLID, GraphQLNonNull, GraphQLObjectType, GraphQLString} from 'graphql'
import OpenAIManager from '../../../client/utils/OpenAIManager'
import {NewMeetingPhaseTypeEnum} from '../../database/types/GenericMeetingPhase'
import MeetingRetrospective from '../../database/types/MeetingRetrospective'
import ReflectionGroup from '../../database/types/ReflectionGroup'
import {GQLContext} from '../graphql'
import Discussion from './Discussion'
import DiscussionThreadStage, {discussionThreadStageFields} from './DiscussionThreadStage'
import NewMeetingStage, {newMeetingStageFields} from './NewMeetingStage'
import RetroReflectionGroup from './RetroReflectionGroup'

const DUMMY_DISCUSSION = {
  id: 'dummy-discussion-id',
  teamId: '',
  meetingId: '',
  createdAt: '',
  discussionTopicId: '',
  discussionTopicType: '',
  commentCount: 0,
  thread: {
    edges: []
  }
}

const RetroDiscussStage = new GraphQLObjectType<any, GQLContext>({
  name: 'RetroDiscussStage',
  description: 'The stage where the team discusses a single theme',
  interfaces: () => [NewMeetingStage, DiscussionThreadStage],
  isTypeOf: ({phaseType}) => (phaseType as NewMeetingPhaseTypeEnum) === 'discuss',
  fields: () => ({
    ...newMeetingStageFields(),
    ...discussionThreadStageFields(),
    discussion: {
      type: new GraphQLNonNull(Discussion),
      description: 'The discussion about the stage or a dummy data when there is no disscussion',
      resolve: async ({discussionId, reflectionGroupId}, _args: unknown, {dataLoader}) => {
        const isDummy = reflectionGroupId === ''
        return isDummy ? DUMMY_DISCUSSION : dataLoader.get('discussions').load(discussionId)
      }
    },
    reflectionGroupId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'foreign key. use reflectionGroup'
    },
    reflectionGroup: {
      type: new GraphQLNonNull(RetroReflectionGroup),
      description: 'the group that is the focal point of the discussion',
      resolve: async ({reflectionGroupId, meetingId}, _args: unknown, {dataLoader}) => {
        if (!reflectionGroupId) {
          const meeting = (await dataLoader
            .get('newMeetings')
            .load(meetingId)) as MeetingRetrospective
          const prompts = await dataLoader
            .get('reflectPromptsByTemplateId')
            .load(meeting.templateId)
          return new ReflectionGroup({
            id: `${meetingId}:dummyGroup`,
            meetingId,
            promptId: prompts[0]!.id,
            title: 'Unknown'
          })
        }
        return dataLoader.get('retroReflectionGroups').load(reflectionGroupId)
      }
    },
    sortOrder: {
      type: new GraphQLNonNull(GraphQLFloat),
      description: 'The sort order for reprioritizing discussion topics'
    },
    reflectionSummaryText: {
      type: GraphQLString,
      description: 'GPT-3 generated summary text for the reflections on this topic',
      resolve: async ({reflectionGroupId}, _args: unknown, {dataLoader}) => {
        const reflections = await dataLoader
          .get('retroReflectionsByReflectionGroupId')
          .load(reflectionGroupId)
        const mapping = new Map()
        await Promise.all(
          reflections.map(async (reflection) => {
            const promptId = reflection.promptId
            const prompt = await dataLoader.get('reflectPrompts').load(promptId)
            if (!mapping.get(prompt.description)) {
              mapping.set(prompt.description, [])
            }
            const contents = mapping.get(prompt.description)
            contents.push(reflection.plaintextContent)
            mapping.set(prompt.description, contents)
          })
        )
        const openaiManager = new OpenAIManager()
        const response = await openaiManager.summarizeReflectionGroup(mapping)
        let topicSummary = ''
        if (response.status === 200) {
          topicSummary = response.data.choices[0].text
        }
        topicSummary.trim()

        return `Topic summary: ${topicSummary}`
      }
    },
    discussionSummaryText: {
      type: GraphQLString,
      description: 'GPT-3 generated summary text for the discussion on this topic',
      resolve: async (
        {discussionId, reflectionGroupId},
        _args: unknown,
        {dataLoader}: GQLContext
      ) => {
        const reflectionGroup = await dataLoader
          .get('retroReflectionGroups')
          .load(reflectionGroupId)
        const comments = await dataLoader.get('commentsByDiscussionId').load(discussionId)
        if (comments.length === 0) {
          return `No discussion was taken down for this topic`
        }
        const commentStrs: string[] = []
        await Promise.all(
          comments.map(async (comment) => {
            const creatorName = comment.isAnonymous
              ? 'Someone'
              : (await dataLoader.get('users').load(comment.createdBy))?.preferredName
            commentStrs.push(`${creatorName}: ${comment.plaintextContent}`)
          })
        )
        const commentsStr = commentStrs.join('\n')
        const openaiManager = new OpenAIManager()
        const response = await openaiManager.summarizeDiscussion(
          reflectionGroup.title ?? '',
          commentsStr
        )
        let discussionSummary = ''
        if (response.status === 200) {
          discussionSummary = response.data.choices[0].text
        }
        discussionSummary.trim()

        return `Topic discussions: ${discussionSummary}`
      }
    },
    taskSummaryText: {
      type: GraphQLString,
      resolve: async ({discussionId}, _args: unknown, {dataLoader}: GQLContext) => {
        const tasks = await dataLoader.get('tasksByDiscussionId').load(discussionId)
        const taskCreators = new Set()
        await Promise.all(
          tasks.map(async (task) => {
            const creatorName = (await dataLoader.get('users').load(task.createdBy))?.preferredName
            taskCreators.add(creatorName ?? 'Someone')
          })
        )
        return `${
          taskCreators.size > 0 ? Array.from(taskCreators.values()).join(', ') : 'Nobody'
        } created tasks to follow up.`
      }
    }
  })
})

export default RetroDiscussStage
