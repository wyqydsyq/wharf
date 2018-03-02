const { FuseBox, WebIndexPlugin } = require('fuse-box')
const fuse = FuseBox.init({
  homeDir: 'src',
  target: 'browser@es6',
  output: 'dist/$name.js',
  plugins: []
})
fuse.dev({ httpServer: false }) // launch http server

fuse
  .bundle('server/bundle')
  .instructions(' > [server/index.ts]')
  .completed(proc => proc.start())
  .watch()

fuse
  .bundle('client/bundle')
  .instructions(' > client/index.ts')
  .hmr()
  .watch()

fuse.run()
