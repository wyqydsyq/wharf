import xs from 'xstream'
import { pre } from '@cycle/dom'

export const Main = sources => {
  const wsSource = sources.WS || xs.from([])
  return {
    DOM: wsSource.startWith(pre(['🔥 😉']))
  }
}

export default Main
