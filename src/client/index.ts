import { run } from '@cycle/run'
import { makeDOMDriver } from '@cycle/dom'
import { makeWSDriver } from 'cycle-websocket'

import Main from './Main'

run(Main, {
  DOM: makeDOMDriver('body'),
  WS: makeWSDriver({ port: 3000 })
})
