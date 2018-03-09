import { run } from '@cycle/run'
import { makeDOMDriver } from '@cycle/dom'
import { makeWebSocketDriver } from './drivers/WebSocket'

import Main from './Main'

run(Main, {
  DOM: makeDOMDriver('body'),
  WS: makeWebSocketDriver()
})
