import * as Docker from 'dockerode'
import * as ws from 'koa-websocket'
import * as Koa from 'koa'
import * as route from 'koa-route'

import { run } from '@cycle/run'
import { makeHTMLDriver } from '@cycle/html'
import { makeServerHistoryDriver } from '@cycle/history'

import Boilerplate from './Boilerplate'
import Main from '../client/Main'

const docker = new Docker()
const server = ws(new Koa())

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

server.ws.use(
  route.all('/swarms', async (ctx, next) => {
    const swarm = await docker.swarmInspect()
    ctx.websocket.send(swarm)
    return next(ctx)
  })
)

server.listen(3000)
