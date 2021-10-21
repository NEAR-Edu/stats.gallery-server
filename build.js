const isProduction =
  (process.env['NODE_ENV'] || '').toLowerCase() === 'production';

require('esbuild').build({
  entryPoints: ['src/index.ts'],
  external: ['canvas', 'pg'],
  platform: 'node',
  bundle: true,
  sourcemap: false, // Enabling sourcemaps breaks slonik for some reason
  minify: isProduction,
  target: 'node14',
  outdir: 'dist',
  publicPath: 'dist',
  loader: {
    '.ttf': 'file',
    '.png': 'file',
  },
});
