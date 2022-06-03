import {TourProvider} from '@reactour/tour'
import React from 'react'
import {BrowserRouter as Router} from 'react-router-dom'
import Action from './components/Action/Action'
import AtmosphereProvider from './components/AtmosphereProvider/AtmosphereProvider'

const steps = [
  {
    selector: '[title="Reflect"]',
    content: 'This is my 1st Step'
  },
  {
    selector: '.DraftEditor-root',
    content: `Let's edit this reflection`
  },
  {
    selector: '[data-cy="next-phase"]',
    content: "Tap 'Next' again to Confirm"
  },
  {
    selector: '[title="Group"]',
    content: 'This is my 2nd Step'
  },
  {
    selector: '[title="Vote"]',
    content: 'This is my 3rd Step'
  },
  {
    selector: '[title="Discuss"]',
    content: 'This is my last Step'
  }
  // ...
]

export default function Root() {
  return (
    <AtmosphereProvider>
      <Router>
        <TourProvider steps={steps}>
          <Action />
        </TourProvider>
      </Router>
    </AtmosphereProvider>
  )
}
