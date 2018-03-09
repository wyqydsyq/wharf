import xs from 'xstream'
import { adapt } from '@cycle/run/lib/adapt'

import { server } from '../../config'

export interface Options {
  retry?: number
  path?: string
}

export const makeWebSocketDriver = (options?: Options) => {
  const host = `ws://${server.host}:${server.port}${
    options && options.path ? options.path : ''
  }`
  const retry = (options && options.retry) || 5

  let connection = connect(host)
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

    // map the resolved connection to a stream of incoming events
    const source$ = xs
      .from(connection)
      .map(connection =>
        xs.create({
          start: listener => {
            connection.onerror = function(err) {
              console.error(`Socket error: ${err}`)
              listener.error(err)
            }

            connection.onmessage = function(msg) {
              listener.next(msg)
            }
          },
          stop: () => {
            connection.close()
          }
        })
      )
      .flatten()

    return adapt(source$)
  }
}

const connect = host => {
  let pendingTimer
  let pendingConnection: WebSocket | undefined
  return new Promise<WebSocket>((res, rej) => {
    pendingTimer = setInterval(async () => {
      if (!pendingConnection) {
        try {
          console.info(`Attempting connection to: ${host}`)
          pendingConnection = new WebSocket(host)
          pendingConnection.onopen = function(this: WebSocket, ev: Event) {
            pendingTimer = clearTimeout(pendingTimer)
            console.log('Sucessfully connected to: ', this)
            res(this)
          }
          pendingConnection.onerror = function(this: WebSocket, ev: Event) {
            console.error('WebSocket error: ', ev)
            rej(this)
          }
          pendingConnection.onclose = function(this: WebSocket, ev: Event) {
            console.log(`Disconnected...`)
            // connection = connect()
          }
        } catch (e) {
          console.error(e)
        }
      } else {
        rej(`Unable to connect to ${host}.`)
      }
    }, 1000)
  })
}

export default makeWebSocketDriver
