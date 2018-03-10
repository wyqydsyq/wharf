const { FuseBox, WebIndexPlugin } = require('fuse-box')
const fuse = FuseBox.init({
  homeDir: 'src',
  target: 'browser@es6',
  output: 'dist/$name.js',
  plugins: []
})

fuse.dev({ httpServer: false }) // just hmr server

fuse
  .bundle('client/bundle')
  .instructions(' > client/index.ts')
  .watch('client/**')
  .hmr()

fuse
  .bundle('server/bundle')
  .instructions(' > [server/index.ts]')
  .watch()
  .completed(proc => {
    setTimeout(() => {
      proc.start()
    }, 1000)
  })

fuse.run()
