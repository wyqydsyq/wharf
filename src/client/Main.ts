import xs from 'xstream'
import { pre, div } from '@cycle/dom'

export const Main = sources => {
  const wsSource$ = sources.WS || xs.from([])
  const message$ = wsSource$.map(ev => JSON.parse(ev.data)).startWith(null)
  const DOM$ = message$.map(msg => {
    return div(
      {
        attrs: {
          style:
            'display: flex; justify-content: center; align-items: center; height: 100%;'
        }
      },
      [
        pre(
          {
            attrs: {
              style:
                'flex: 0 0 50%; background: #eee; padding: 1rem; border-radius: 5px; box-shadow: 0 10px 200px rgba(0, 0, 0, .5);'
            }
          },
          [
            msg
              ? 'Connected Clients: \n' + JSON.stringify(msg, null, '\t')
              : div(
                  { attrs: { style: 'text-align: center; font-size: 4em' } },
                  ['🔥']
                )
          ]
        )
      ]
    )
  })
  return {
    DOM: DOM$,
    WS: xs.of('Hello from the client!')
  }
}

export default Main
