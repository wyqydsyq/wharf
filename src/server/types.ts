import { Context } from 'koa'
import WebSocket from 'ws'

export interface WSContext extends Context {
  websocket: WebSocket
}

export interface Client {
  metadata: ClientMetadata
  websocket: WebSocket
}

export interface ClientMetadata {
  id: string
  born: number
  age?: number
}
