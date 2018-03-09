import * as websockets from 'koa-websocket'
import * as Koa from 'koa'
import * as route from 'koa-route'
import * as mount from 'koa-mount'
import * as serve from 'koa-static'
import uuid from 'uuid/v4'
import WebSocket from 'ws'
import { mapObjIndexed } from 'ramda'

// stuff for cycle SSR
import { run } from '@cycle/run'
import { makeHTMLDriver } from '@cycle/html'
import { makeServerHistoryDriver } from '@cycle/history'
import Boilerplate from './Boilerplate'
import Main from '../client/Main'

import { server as config } from '../config'

const server = websockets(new Koa())

// list of active websockets
const wsl: {
  [index: string]: WebSocket
} = {}

interface WSCTX extends Koa.Context {
  websocket: WebSocket
}

server.use(mount('/static', serve('./dist')))
server.use(
  route.all('/', (ctx: Koa.Context) => {
    run(sources => Boilerplate(sources, Main), {
      History: makeServerHistoryDriver({
        initialEntries: [ctx.path]
      }),
      DOM: makeHTMLDriver(html => {
        ctx.body = html
      })
    })
  })
)

server.ws.use(async (ctx: WSCTX, next) => {
  await new Promise(connectionReady => {
    let connecting = setInterval(() => {
      if (ctx.websocket.readyState === 1 && ctx.websocket.OPEN) {
        clearInterval(connecting)
        connectionReady()
      }
    })
  })

  const id = uuid()
  const meta = {
    id,
    initialized: new Date()
  }
  console.log(`WS:Open "${id}"`)

  ctx.websocket.on('message', msg => {
    console.log(`WS:Message "${id}":`, msg)
  })

  ctx.websocket.on('close', () => {
    console.log(`WS:Close "${id}"`)
    delete wsl[id]
  })

  setInterval(() => {
    const time = new Date()
    wsl[id] &&
      ctx.websocket.send(
        JSON.stringify({
          time,
          wsh: mapObjIndexed(
            (ws: WebSocket, id) => ({
              id,
              age:
                time.getUTCMilliseconds() -
                meta.initialized.getUTCMilliseconds(),
              ...meta
            }),
            wsl
          )
        })
      )
  }, 1000)

  wsl[id] = ctx.websocket
  return next()
})

server.listen(config.port)
console.log(`Started Koa HTTP & WS server on port ${config.port}`)
