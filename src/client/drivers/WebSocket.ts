import xs from 'xstream'
import { adapt } from '@cycle/run/lib/adapt'

import { server } from '../../config'

export interface Options {
  retryLimit?: number
  retryRate?: number
  path?: string
}

export const makeWebSocketDriver = (options?: Options) => {
  const host = `ws://${server.host}:${server.port}${
    options && options.path ? options.path : ''
  }`
  const retryLimit = (options && options.retryLimit) || 5
  const retryRate = (options && options.retryRate) || 3000

  const connection = connect(host)
  return send$ => {
    // map each event in send$ (app Sink) to a WebSocket.send(msg)
    send$.addListener({
      next: msg => {
        // wait for the connection to be ready before sending
        connection.then(activeConnection => {
          activeConnection.send(msg)
        })
      },
      error: err => {
        console.error('err', err)
      },
      stop: () => {}
    })

    const source$ = xs
      .from(connection)
      .map(activeConnection =>
        connectionMapper(host, retryLimit, retryRate, activeConnection)
      )
      .flatten()

    return adapt(source$)
  }
}

// map the resolved connection to a stream of incoming events
const connectionMapper = (
  host: string,
  retryLimit: number,
  retryRate: number,
  connection: WebSocket
) =>
  xs.create({
    start: listener => {
      connection.onerror = function(err) {
        console.error(`Socket error: ${err}`)
        listener.error(err)
      }

      connection.onmessage = function(msg) {
        listener.next(msg)
      }
      connection.onclose = async function(ev: CloseEvent) {
        console.log(`Disconnected: `, ev)

        for (
          let attempts = 1;
          attempts <= retryLimit && connection.readyState !== connection.OPEN;
          attempts++
        ) {
          await new Promise(retryRateElapsed =>
            setTimeout(() => {
              retryRateElapsed()
            }, retryRate)
          )

          console.log(`Reconnection attempt ${attempts}/${retryLimit}`)
          try {
            connection = await connect(host)
            listener.next(connection)
          } catch (e) {
            console.error(`Reconnection failed:`, e)
          }
        }
      }
    },
    stop: () => {
      connection.close()
    }
  })

const connect = (host: string) => {
  return new Promise<WebSocket>((res, rej) => {
    try {
      console.info(`Attempting connection to: ${host}`)
      const pendingConnection = new WebSocket(host)
      pendingConnection.onopen = function(this: WebSocket, ev: Event) {
        console.log('Sucessfully connected to: ', this)
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
