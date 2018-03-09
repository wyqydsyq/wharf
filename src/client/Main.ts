import xs from 'xstream'
import { h1 } from '@cycle/dom'

export const Main = sources => {
  const wsSource$ = sources.WS || xs.from([])
  const message$ = wsSource$.map(ev => ev.data).startWith(['🔥'])
  const DOM$ = message$.map(msg =>
    h1(
      {
        attrs: {
          style: 'text-shadow: 0px 5px 10px #666; text-align: center'
        }
      },
      [msg]
    )
  )
  return {
    DOM: DOM$,
    WS: xs.of('Hello from the client!')
  }
}

export default Main
