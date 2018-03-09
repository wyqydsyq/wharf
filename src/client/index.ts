import { run } from '@cycle/run'
import { makeDOMDriver } from '@cycle/dom'

import Main from './Main'

run(Main, {
  DOM: makeDOMDriver('body')
})
