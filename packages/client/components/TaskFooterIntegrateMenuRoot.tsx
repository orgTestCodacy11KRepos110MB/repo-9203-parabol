import graphql from 'babel-plugin-relay/macro'
import React, {Suspense} from 'react'
import {createFragmentContainer} from 'react-relay'
import {MenuProps} from '../hooks/useMenu'
import {MenuMutationProps} from '../hooks/useMutationProps'
import useQueryLoaderNow from '../hooks/useQueryLoaderNow'
import {UseTaskChild} from '../hooks/useTaskChildFocus'
import {LoaderSize} from '../types/constEnums'
import taskFooterIntegrateMenuQuery, {
  TaskFooterIntegrateMenuQuery
} from '../__generated__/TaskFooterIntegrateMenuQuery.graphql'
import {TaskFooterIntegrateMenuRoot_task} from '../__generated__/TaskFooterIntegrateMenuRoot_task.graphql'
import LoadingComponent from './LoadingComponent/LoadingComponent'
import TaskFooterIntegrateMenu from './TaskFooterIntegrateMenu'

interface Props {
  menuProps: MenuProps
  loadingDelay: number
  loadingWidth: number
  mutationProps: MenuMutationProps
  task: TaskFooterIntegrateMenuRoot_task
  useTaskChild: UseTaskChild
}

const TaskFooterIntegrateMenuRoot = ({
  menuProps,
  loadingDelay,
  loadingWidth,
  mutationProps,
  task,
  useTaskChild
}: Props) => {
  const {teamId, userId} = task
  useTaskChild('integrate')
  const queryRef = useQueryLoaderNow<TaskFooterIntegrateMenuQuery>(taskFooterIntegrateMenuQuery, {
    teamId,
    userId: userId || ''
  })
  return (
    <Suspense
      fallback={
        <LoadingComponent
          delay={loadingDelay}
          spinnerSize={LoaderSize.MENU}
          height={loadingWidth ? LoaderSize.MENU : undefined}
          width={loadingWidth}
          showAfter={loadingWidth ? 0 : undefined}
        />
      }
    >
      {queryRef && (
        <TaskFooterIntegrateMenu
          queryRef={queryRef}
          menuProps={menuProps}
          mutationProps={mutationProps}
          task={task}
        />
      )}
    </Suspense>
  )
}

export default createFragmentContainer(TaskFooterIntegrateMenuRoot, {
  task: graphql`
    fragment TaskFooterIntegrateMenuRoot_task on Task {
      teamId
      userId
      ...TaskFooterIntegrateMenu_task
    }
  `
})
