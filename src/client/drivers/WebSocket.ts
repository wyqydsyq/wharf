import xs from 'xstream'
import { adapt } from '@cycle/run/lib/adapt'

import { server } from '../../config'

export interface Options {
  retryLimit?: number
  retryRate?: number
  path?: string
}

declare global {
  interface Window {
    __ch: Promise<WebSocket>
  }
}

export const makeWebSocketDriver = (options?: Options) => {
  const host = `ws://${server.host}:${server.port}${
    options && options.path ? options.path : ''
  }`
  const retryLimit = (options && options.retryLimit) || 5
  const retryRate = (options && options.retryRate) || 3000

  window.__ch = connect(host)
  return send$ => {
    // map each event in send$ (app Sink) to a WebSocket.send(msg)
    send$.addListener({
      next: msg => {
        // wait for the connection to be ready before sending
        window.__ch.then(activeConnection => {
          activeConnection.send(msg)
        })
      },
      error: err => {
        console.error('err', err)
      },
      stop: () => {}
    })

    const source$ = xs
      .from(window.__ch)
      .map(activeConnection =>
        handleConnection(host, retryLimit, retryRate, activeConnection)
      )
      .flatten()

    return adapt(source$)
  }
}

// map the resolved connection to a stream of incoming events
const handleConnection = (
  host: string,
  retryLimit: number,
  retryRate: number,
  connection: WebSocket
) =>
  xs.create({
    start: async listener => {
      connection.onerror = function(err) {
        console.error(`Socket error: ${err}`)
        listener.error(err)
      }

      connection.onmessage = function(msg) {
        listener.next(msg)
      }
      connection.onclose = async function(ev: CloseEvent) {
        console.log(`WebSocket disconnected: `, ev)
        listener.next(connection)

        for (
          let attempts = 1;
          (!await window.__ch ||
            (await window.__ch).readyState === (await window.__ch).CLOSED) &&
          attempts <= retryLimit;
          attempts++
        ) {
          await new Promise(retryRateElapsed =>
            setTimeout(() => {
              retryRateElapsed()
            }, retryRate)
          )

          console.log(`Reconnection attempt ${attempts}/${retryLimit}`)
          try {
            window.__ch = connect(host)
            const ch = await window.__ch

            // rebind new connection's listener
            ch.onmessage = function(msg) {
              listener.next(msg)
            }

            // emit handle so app can react to new state etc
            listener.next(ch)
          } catch (e) {
            console.error(`Reconnection failed:`, e)
            delete window.__ch
          }
        }
      }

      listener.next(connection)
    },
    stop: () => {
      window.__ch.then(h => h.close())
    }
  })

const connect = (host: string) => {
  return new Promise<WebSocket>(async (res, rej) => {
    // force-close any stale connection
    if (window.__ch) {
      ;(await window.__ch).close()
      await new Promise(wait =>
        setTimeout(() => {
          wait()
        }, 1000)
      )
    }

    try {
      console.info(`Attempting connection to: ${host}`)
      const pendingConnection = new WebSocket(host)
      pendingConnection.onopen = function(this: WebSocket, ev: Event) {
        console.log('WebSocket connected: ', ev)
        res(this)
      }
      pendingConnection.onerror = function(this: WebSocket, ev: Event) {
        console.error('WebSocket error: ', ev)
        rej(ev)
      }
    } catch (e) {
      console.error(e)
      rej(e)
    }
  })
}

export default makeWebSocketDriver
