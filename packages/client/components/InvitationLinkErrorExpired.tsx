import styled from '@emotion/styled'
import graphql from 'babel-plugin-relay/macro'
import React, {useEffect} from 'react'
import {useFragment} from 'react-relay'
import useAtmosphere from '../hooks/useAtmosphere'
import useDocumentTitle from '../hooks/useDocumentTitle'
import useRouter from '../hooks/useRouter'
import AcceptTeamInvitationMutation from '../mutations/AcceptTeamInvitationMutation'
import PushInvitationMutation from '../mutations/PushInvitationMutation'
import hasToken from '../utils/hasToken'
import {InvitationLinkErrorExpired_massInvitation$key} from '../__generated__/InvitationLinkErrorExpired_massInvitation.graphql'
import DialogContent from './DialogContent'
import DialogTitle from './DialogTitle'
import FlatPrimaryButton from './FlatPrimaryButton'
import InvitationDialogCopy from './InvitationDialogCopy'
import InviteDialog from './InviteDialog'
import LinkButton from './LinkButton'

interface Props {
  massInvitationRef: InvitationLinkErrorExpired_massInvitation$key
}

const TeamName = styled('span')({
  fontWeight: 600,
  whiteSpace: 'nowrap'
})

const DialogActions = styled('div')({
  marginTop: 20,
  display: 'flex',
  justifyContent: 'center'
})

const DashboardButton = styled(LinkButton)({
  fontWeight: 600,
  width: '50%'
})

const InvitationLinkErrorExpired = (props: Props) => {
  const {massInvitationRef} = props
  useDocumentTitle(`Token Expired | Invitation Link`, 'Invitation Link')

  const {history} = useRouter()
  const atmosphere = useAtmosphere()

  const massInvitation = useFragment(
    graphql`
      fragment InvitationLinkErrorExpired_massInvitation on MassInvitationPayload {
        teamName
        teamId

        teamInvitation {
          teamInvitation {
            token
          }
          teamId
          meetingId
        }
      }
    `,
    massInvitationRef
  )

  const {teamName, teamId} = massInvitation
  const teamInvitation = massInvitation.teamInvitation.teamInvitation

  useEffect(
    () => {
      if (teamInvitation) {
        console.log('accept Team Inv')
        // if an invitation already exists, accept it
        AcceptTeamInvitationMutation(atmosphere, {invitationToken: teamInvitation.token}, {history})
        return
      }
      return undefined
    },
    [
      /* eslint-disable-line react-hooks/exhaustive-deps*/
    ]
  )

  const requestInvite = () => {
    if (teamId) {
      PushInvitationMutation(atmosphere, {teamId})
      atmosphere.eventEmitter.emit('addSnackbar', {
        key: 'inviteRequested',
        message: 'Invite requested',
        autoDismiss: 5,
        showDismissButton: true
      })
    }
  }

  return (
    <InviteDialog>
      <DialogTitle>Invitation Link Expired</DialogTitle>
      <DialogContent>
        <InvitationDialogCopy>
          The invitation to <TeamName>{teamName}</TeamName> has expired.
        </InvitationDialogCopy>
        <InvitationDialogCopy>
          {hasToken()
            ? `Request a new invitation or reach out to the team administrator.`
            : `Sign in to request a new invitation or reach out to the team administrator.`}
        </InvitationDialogCopy>
        <DialogActions>
          {hasToken() ? (
            <>
              <FlatPrimaryButton onClick={requestInvite} size='medium'>
                Request Invite
              </FlatPrimaryButton>
              <DashboardButton
                onClick={() => history.push('/meetings')}
                size='medium'
                palette='blue'
              >
                Go to Dashboard
              </DashboardButton>
            </>
          ) : (
            <FlatPrimaryButton onClick={() => history.push('/')} size='medium'>
              Sign In
            </FlatPrimaryButton>
          )}
        </DialogActions>
      </DialogContent>
    </InviteDialog>
  )
}

export default InvitationLinkErrorExpired
