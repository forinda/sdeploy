// server/vite.serverless.config.ts
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import swc from 'unplugin-swc'
import { devtoolsFlagPlugin, devtoolsStripPlugin } from '@forinda/kickjs-vite'

export default defineConfig({
  oxc: false,
  // The devtools plugins do what kickjsVitePlugin does in `kick build`:
  // devtools code stays out of the production bundle.
  plugins: [swc.vite(), devtoolsFlagPlugin(), devtoolsStripPlugin()],
  ssr: { noExternal: true, target: 'node' },
  build: {
    ssr: true,
    target: 'node20',
    outDir: 'dist/serverless',
    minify: false,
    rollupOptions: {
      input: fileURLToPath(new URL('./src/serverless.ts', import.meta.url)),
      // Optional peers you have NOT installed: inlined, a missing one becomes a
      // stub that throws on load. Remove any you install — left external, it
      // stays a bare import the Vercel function can't resolve.
      external: ['valibot', 'yup'],
      output: { format: 'esm', entryFileNames: 'server.mjs', codeSplitting: false },
    },
  },
})
