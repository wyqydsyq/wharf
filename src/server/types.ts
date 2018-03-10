import { Context } from 'koa'
import WebSocket from 'ws'

export interface WSCTX extends Context {
  websocket: WebSocket
}

export interface WSList {
  [index: string]: {
    metadata: WSMetadata
    websocket: WebSocket
  }
}

export interface WSMetadata {
  id: string
  born: number
  age?: number
}
