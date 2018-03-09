import xs from 'xstream'
import { adapt } from '@cycle/run/lib/adapt'

import { server } from '../../config'

export interface Options {
  retry: number
}

export const makeWebSocketDriver = (options?: Options) => {
  const host = `ws://${server.host}:${server.port}`
  const retry = (options && options.retry) || 5
  let retries = 0
  let retrying
  let pendingConnection

  const connection = new Promise<WebSocket>((res, rej) => {
    retrying = setInterval(async () => {
      if (retrying && !pendingConnection && retries < retry) {
        try {
          console.info(`Connection attempt ${retries} for ${host}`)
          pendingConnection = new WebSocket(host)
          pendingConnection.onopen = function(this: WebSocket, ev: Event) {
            console.log('Sucessfully connected to: ', this)
          }
          retrying = clearTimeout(retrying)

          res(
            new Promise(connectionComplete => {
              let awaitConnectionCompletion = setInterval(() => {
                if (pendingConnection.readyState) {
                  clearTimeout(awaitConnectionCompletion)
                  connectionComplete(pendingConnection)
                }
              }, 1000)
            })
          )
        } catch (e) {
          console.error(e)
          retries = retries + 1
        }
      } else {
        rej(
          `Unable to connect to ${host}, retry limit of ${retry} attempts exceeded.`
        )
      }
    }, 1000)
  })

  return send$ => {
    send$.addListener({
      next: msg => {
        // wait for the connection to be ready before sending
        connection.then(activeConnection => {
          activeConnection.send(msg)
        })
      },
      error: err => {
        console.error(err)
      },
      stop: () => {}
    })

    const source$ = xs
      .from(connection)
      .map(connection =>
        xs.create({
          start: listener => {
            connection.onerror = function(err) {
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

export default makeWebSocketDriver
