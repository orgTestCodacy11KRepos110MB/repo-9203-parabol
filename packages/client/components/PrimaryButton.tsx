import React, {forwardRef} from 'react'
import styled from '@emotion/styled'
import BaseButton, {BaseButtonProps} from './BaseButton'
import ui from '../styles/ui'
import {Elevation} from 'styles/elevation'

const StyledBaseButton = styled(BaseButton)((props: BaseButtonProps) => {
  const {disabled, waiting} = props
  const visuallyDisabled = disabled || waiting
  return {
    backgroundImage: visuallyDisabled ? ui.gradientWarmLightened : ui.gradientWarm,
    borderRadius: ui.buttonBorderRadius,
    color: ui.palette.white,
    fontWeight: 600,
    opacity: visuallyDisabled ? 1 : undefined,
    outline: 0,
    ':hover,:focus,:active': {
      backgroundImage: visuallyDisabled ? ui.gradientWarmLightened : ui.gradientWarmDarkened,
      opacity: visuallyDisabled ? 1 : undefined
    }
  }
})

interface Props extends BaseButtonProps {}

const PrimaryButton = forwardRef((props: Props, ref: any) => {
  const {children, className, elevationHovered, elevationResting} = props
  return (
    <StyledBaseButton
      {...props}
      ref={ref}
      className={className}
      elevationHovered={elevationHovered || Elevation.Z8}
      elevationResting={elevationResting || Elevation.Z2}
      elevationPressed={elevationResting || Elevation.Z5}
    >
      {children}
    </StyledBaseButton>
  )
})

export default PrimaryButton
