import * as Koa from 'koa'
import * as KoaWebsocket from 'koa-websocket'
import * as route from 'koa-route'
import * as mount from 'koa-mount'
import * as serve from 'koa-static'
import * as uuid from 'uuid/v4'

// stuff for cycle SSR
import { run } from '@cycle/run'
import { makeHTMLDriver } from '@cycle/html'
import { makeServerHistoryDriver } from '@cycle/history'
import Boilerplate from './Boilerplate'
import Main from '../client/Main'

import { Client, WSContext } from './types'
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

// Map of active websocket clients, indexed by ID
const clientList = new Map<string, Client>()

// handle incoming ws client connections
app.ws.use(async function(ctx: WSContext) {
  const id = uuid()
  const client: Client = {
    websocket: ctx.websocket,
    metadata: {
      id,
      born: Math.round(new Date().valueOf() / 1000)
    }
  }

  clientList.set(id, client)
  console.log(`WS:${id}:Open`)

  let heartbeat = setInterval(() => {
    const time = Math.round(new Date().valueOf() / 1000)
    const payload = {
      id,
      time,
      clients: {}
    }

    clientList.forEach((client: Client, id: string) => {
      payload.clients[id] = {
        id,
        age: time - client.metadata.born,
        ...client.metadata
      }
    })

    client.websocket.send(JSON.stringify(payload))
  }, 1000)

  client.websocket.on('message', msg => {
    console.log(`WS:${id}:Message:`, msg)
  })

  client.websocket.on('close', () => {
    console.log(`WS:${id}:Close`)
    clearInterval(heartbeat)
    clientList.delete(id)
  })

  return
})

app.listen(config.port)
console.log(`Started Koa HTTP & WS server on port ${config.port}`)
