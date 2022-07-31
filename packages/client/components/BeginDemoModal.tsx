import styled from '@emotion/styled'
import Chat from '@mui/icons-material/Chat'
import React from 'react'
import useAtmosphere from '../hooks/useAtmosphere'
import LocalAtmosphere from '../modules/demo/LocalAtmosphere'
import {PALETTE} from '../styles/paletteV3'
import DialogContainer from './DialogContainer'
import PrimaryButton from './PrimaryButton'

const StyledDialogContainer = styled(DialogContainer)({
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  padding: '24px 16px 32px',
  width: 500
})

const StyledCopy = styled('p')({
  fontSize: 16,
  lineHeight: 1.5,
  margin: '16px 0 24px',
  padding: 0,
  textAlign: 'center'
})

const StyledIcon = styled(Chat)({
  color: PALETTE.SKY_500,
  width: 48,
  height: 48
})

interface Props {
  closePortal: () => void
}

const BeginDemoModal = (props: Props) => {
  const {closePortal} = props
  const atmosphere = useAtmosphere() as unknown as LocalAtmosphere
  const {clientGraphQLServer} = atmosphere
  const {startBot} = clientGraphQLServer
  const onClick = () => {
    startBot()
    closePortal()
    setTimeout(() => {
      clientGraphQLServer.emit('startDemo')
    }, 1000)
  }
  return (
    <StyledDialogContainer>
      <StyledIcon />
      <StyledCopy>
        Try Parabol for yourself by holding a 2-minute retrospective meeting with our simulated
        colleagues
      </StyledCopy>
      <PrimaryButton dataCy='start-demo-button' onClick={onClick} size='medium'>
        Start Demo
      </PrimaryButton>
    </StyledDialogContainer>
  )
}

export default BeginDemoModal
