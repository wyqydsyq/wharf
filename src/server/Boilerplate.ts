import xs from 'xstream'
import { Sources, Sinks } from '@cycle/run'
import { pre } from '@cycle/dom'

export const Boilerplate = (
  sources: Sources,
  Main: (sources: Sources) => Sinks
) => {
  const MainDOM = Main(sources).DOM.take(1)

  return {
    DOM: MainDOM
  }
}

export default Boilerplate
