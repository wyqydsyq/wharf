// import * as Docker from 'dockerode'
import * as ws from 'koa-websocket'
import * as Koa from 'koa'
import * as route from 'koa-route'
import * as mount from 'koa-mount'
import * as serve from 'koa-static'

import { run } from '@cycle/run'
import { makeHTMLDriver } from '@cycle/html'
import { makeServerHistoryDriver } from '@cycle/history'

import { server as config } from '../config'

import Boilerplate from './Boilerplate'
import Main from '../client/Main'

// const docker = new Docker()
const server = ws(new Koa())

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

server.ws.use(async (ctx, next) => {
  // const swarm = await docker.swarmInspect()
  ctx.websocket.on('message', msg => {
    console.log('WS: ', msg)
    ctx.websocket.send('Hello from the server!')
  })
  return next(ctx)
})

server.listen(config.port)
console.log(`Started Koa HTTP & WS server on port ${config.port}`)
