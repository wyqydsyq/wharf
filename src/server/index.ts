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

// list of active websocket clients, keyed by ID
const wsl: {
  [index: string]: {
    metadata: any
    websocket: WebSocket
  }
} = {}

interface WSCTX extends Koa.Context {
  websocket: WebSocket
}

// serve static assets
server.use(mount('/static', serve('./dist')))

// serve SSR-rendered, Boilerplate-wrapped Main like an index.html
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

// handle incoming ws client connections
server.ws.use(async (ctx: WSCTX, next) => {
  // give the client an identity
  const id = uuid()
  const metadata = {
    id,
    born: Math.round(new Date().valueOf() / 1000)
  }
  console.log(`WS:${id}:Open`)

  ctx.websocket.on('message', msg => {
    console.log(`WS:${id}:Message:`, msg)
  })

  ctx.websocket.on('close', () => {
    console.log(`WS:${id}:Close`)
    delete wsl[id]
  })

  // send the client a feed of stuff
  setInterval(() => {
    const time = Math.round(new Date().valueOf() / 1000)
    wsl[id] &&
      wsl[id].websocket.send(
        JSON.stringify({
          time,
          wsh: mapObjIndexed(
            (ws: WebSocket, id) => ({
              id,
              age: time - wsl[id].metadata.born,
              ...wsl[id].metadata
            }),
            wsl
          )
        })
      )
  }, 1000)

  wsl[id] = { metadata, websocket: ctx.websocket }
  return next()
})

server.listen(config.port)
console.log(`Started Koa HTTP & WS server on port ${config.port}`)
