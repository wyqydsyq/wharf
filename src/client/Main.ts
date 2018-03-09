import xs from 'xstream'
import { pre } from '@cycle/dom'

export const Main = sources => {
  const wsSource$ = sources.WS || xs.from([])
  const message$ = wsSource$.map(ev => JSON.parse(ev.data)).startWith('🔥')
  const DOM$ = message$.map(msg => {
    return pre(
      {
        attrs: {
          style: 'max-width: 100%;'
        }
      },
      [JSON.stringify(msg, null, '\t')]
    )
  })
  return {
    DOM: DOM$,
    WS: xs.of('Hello from the client!')
  }
}

export default Main
