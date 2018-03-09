import { Sources, Sinks } from '@cycle/run'
import { html, head, body, script } from '@cycle/dom'

export const Boilerplate = (
  sources: Sources,
  Main: (sources: Sources) => Sinks
) => {
  const MainDOM$ = Main(sources).DOM.take(1)
  const wrappedDOM$ = MainDOM$.map(innerDOM =>
    html([
      head([
        script({
          props: {
            src: '/static/client/bundle.js'
          }
        })
      ]),
      body([innerDOM])
    ])
  )

  return {
    DOM: wrappedDOM$
  }
}

export default Boilerplate
