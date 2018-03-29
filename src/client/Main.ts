import xs from 'xstream'
import { pre, div } from '@cycle/dom'

let myId = undefined

export const Main = sources => {
  const wsSource$ = sources.WS || xs.from([])
  const message$ = wsSource$
    .map(socket => {
      if (socket instanceof WebSocket) {
        return {
          connected: socket.readyState === socket.OPEN
        }
      } else {
        return socket.data && JSON.parse(socket.data)
      }
    })
    .startWith(undefined)

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
              ? JSON.stringify(msg, null, '\t')
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
    WS: message$
      .filter(msg => {
        // unset myId if a disconnection happened
        if (msg && msg.connected === false) {
          myId = undefined
        }

        const recievedId = msg && msg.id
        if ((!myId && !recievedId) || myId) {
          return false
        }

        myId = recievedId
        return true
      })
      .map(msg => `Hello, I'm ${msg.id}!`)
  }
}

export default Main
