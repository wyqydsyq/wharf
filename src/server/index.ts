import * as Koa from 'koa'
import * as KoaWebsocket from 'koa-websocket'
import * as route from 'koa-route'
import * as mount from 'koa-mount'
import * as serve from 'koa-static'
import { mapObjIndexed } from 'ramda'

// stuff for cycle SSR
import { run } from '@cycle/run'
import { makeHTMLDriver } from '@cycle/html'
import { makeServerHistoryDriver } from '@cycle/history'
import Boilerplate from './Boilerplate'
import Main from '../client/Main'

import { WSList, WSCTX } from './types'
import { server as config } from '../config'

const app = KoaWebsocket(new Koa())

// serve static assets
app.use(mount('/static', serve('./dist')))

// serve SSR-rendered, Boilerplate-wrapped Main like an index.html
app.use(
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

// list of active websocket clients, keyed by ID
const wsl: WSList = {}

// handle incoming ws client connections
app.ws.use(async function(ctx: WSCTX) {
  // give the client an identity
  const id = require('uuid/v4')()
  const metadata = {
    id,
    born: Math.round(new Date().valueOf() / 1000)
  }

  // store the client in the WebSocket list
  wsl[id] = { metadata, websocket: ctx.websocket }
  console.log(`WS:${id}:Open`)

  let heartbeat = setInterval(() => {
    const time = Math.round(new Date().valueOf() / 1000)
    const payload = {
      time,
      wsl: mapObjIndexed(
        (ws: WebSocket, wsid) => ({
          id: wsid,
          age: time - wsl[wsid].metadata.born,
          ...wsl[wsid].metadata
        }),
        wsl
      )
    }

    if (wsl[id] && wsl[id].websocket) {
      wsl[id].websocket.send(JSON.stringify(payload))
    }
  }, 1000)

  wsl[id].websocket.on('message', msg => {
    console.log(`WS:${id}:Message:`, msg)
  })

  wsl[id].websocket.on('close', () => {
    console.log(`WS:${id}:Close`)
    clearInterval(heartbeat)
    delete wsl[id]
  })

  return
})

app.listen(config.port)
console.log(`Started Koa HTTP & WS server on port ${config.port}`)
