import xs from 'xstream'
import { pre } from '@cycle/dom'

export const Main = sources => {
  const wsSource = sources.WS || xs.from([])
  return {
    DOM: wsSource.map(ev => ev.data).startWith(pre(['🔥'])),
    WS: xs.of('Hello from the client!')
  }
}

export default Main
