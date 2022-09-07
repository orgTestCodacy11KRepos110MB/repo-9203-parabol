import styled from '@emotion/styled'
import React from 'react'
import {PALETTE} from '~/styles/paletteV3'
import Icon from './Icon'
import PlainButton from './PlainButton/PlainButton'

const StyledPlainButton = styled(PlainButton)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: PALETTE.SKY_500,
  fontWeight: 600,
  fontSize: 14,
  margin: '0 8px',
  ':hover, :focus, :active': {
    color: PALETTE.SKY_600
  },
  transition: 'color 0.1s ease'
})

const SummarizeIcon = styled(Icon)({
  fontSize: 20,
  width: 20,
  height: 20,
  margin: '0 4px 0 0'
})

const SummarizeLabel = styled('div')({
  color: 'inherit'
})

interface Props {
  onClick: () => void
  disabled?: boolean
}

const SummarizeButton = (props: Props) => {
  const {onClick, disabled} = props

  return (
    <StyledPlainButton onClick={onClick} disabled={disabled}>
      <SummarizeIcon>article</SummarizeIcon>
      <SummarizeLabel>Summarize</SummarizeLabel>
    </StyledPlainButton>
  )
}

export default SummarizeButton
