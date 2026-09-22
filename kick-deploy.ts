// server/kick-deploy.ts
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { defineCliPlugin } from '@forinda/kickjs-cli'

export interface DeployPluginOptions {
  /** Serverless entry exporting `handler = createHandler(...)`. Default `src/serverless.ts`. */
  entry?: string
  /** Where the bundle is written, under the project. Default `dist/serverless`. */
  outDir?: string
  /**
   * Built frontend to publish next to the API (fullstack: `../web/dist`).
   * Omit for an API-only project.
   */
  staticDir?: string
  /**
   * Directory the platform deploys from, relative to the project — where
   * `.netlify/` and `.vercel/` are written. Fullstack: `..` (the workspace root).
   */
  siteRoot?: string
  /** URL prefix routed to the function. Default `/api`. */
  apiPath?: string
  /**
   * Optional peers to leave out of the bundle when they are not installed.
   * Installed ones are always bundled: a Vercel function can't see node_modules.
   * Default `['valibot', 'yup']`.
   */
  external?: string[]
  /** Vercel Node runtime. Default `nodejs22.x`. */
  vercelRuntime?: string
}

/**
 * `kick build:netlify` and `kick build:vercel`: bundle the serverless entry
 * with the same Vite + SWC setup as `kick build`, then write the platform's
 * build output around it.
 */
export const deployPlugin = (options: DeployPluginOptions = {}) =>
  defineCliPlugin({
    name: 'deploy',
    register(program, ctx) {
      const opts = {
        entry: 'src/serverless.ts',
        outDir: 'dist/serverless',
        siteRoot: '.',
        apiPath: '/api',
        external: ['valibot', 'yup'],
        vercelRuntime: 'nodejs22.x',
        ...options,
      }
      const root = ctx.projectRoot
      const siteRoot = resolve(root, opts.siteRoot)
      const staticDir = opts.staticDir ? resolve(root, opts.staticDir) : undefined

      /** Build dist/serverless/server.mjs: one self-contained ESM file. */
      async function bundle(): Promise<string> {
        // Loaded here, not at the top: only these commands need them.
        const { build } = await import('vite')
        const { default: swc } = await import('unplugin-swc')
        const { devtoolsFlagPlugin, devtoolsStripPlugin } = await import('@forinda/kickjs-vite')

        await build({
          configFile: false,
          root,
          logLevel: 'warn',
          oxc: false,
          plugins: [swc.vite(), devtoolsFlagPlugin(), devtoolsStripPlugin()],
          resolve: { alias: { '@': resolve(root, 'src') } },
          // Inline every dependency: a Vercel function can't see node_modules
          // outside it, and Netlify must not re-compile the TypeScript.
          ssr: { noExternal: true, target: 'node' },
          build: {
            ssr: true,
            target: 'node20',
            outDir: resolve(root, opts.outDir),
            emptyOutDir: true,
            minify: false,
            rollupOptions: {
              input: resolve(root, opts.entry),
              // Inlined, a missing optional peer becomes a stub that throws on load;
              // left external, an installed one is unreachable from api.func.
              external: opts.external.filter(
                (name) => !existsSync(resolve(root, 'node_modules', name)),
              ),
              output: { format: 'esm', entryFileNames: 'server.mjs', codeSplitting: false },
            },
          },
        })
        const file = resolve(root, opts.outDir, 'server.mjs')
        ctx.log(`bundled ${relative(process.cwd(), file)}`)
        return file
      }

      program
        .command('build:netlify')
        .description('Bundle the API and write the Netlify function')
        .action(async () => {
          const server = await bundle()
          const functions = resolve(siteRoot, '.netlify/v1/functions')
          mkdirSync(functions, { recursive: true })
          // The function imports the bundle; Netlify packages what it imports.
          const from = relative(functions, server).split(sep).join('/')
          writeFileSync(
            resolve(functions, 'api.mjs'),
            `import { handler } from '${from}'

export default (request) => handler.fetch(request)

export const config = {
  path: '${opts.apiPath}/*',
}
`,
          )
          ctx.log(`wrote ${relative(process.cwd(), resolve(functions, 'api.mjs'))}`)
        })

      program
        .command('build:vercel')
        .description('Bundle the API and write .vercel/output (Build Output API v3)')
        .action(async () => {
          const server = await bundle()
          const output = resolve(siteRoot, '.vercel/output')
          const fn = resolve(output, 'functions/api.func')
          rmSync(output, { recursive: true, force: true })
          mkdirSync(fn, { recursive: true })

          // Nothing outside the .func directory is visible at runtime.
          cpSync(server, resolve(fn, 'server.mjs'))
          writeFileSync(
            resolve(fn, 'index.mjs'),
            `import { handler } from './server.mjs'\nexport default handler.node\n`,
          )
          writeFileSync(
            resolve(fn, '.vc-config.json'),
            JSON.stringify(
              {
                runtime: opts.vercelRuntime,
                handler: 'index.mjs',
                launcherType: 'Nodejs',
                supportsResponseStreaming: true,
              },
              null,
              2,
            ),
          )

          const routes: Array<Record<string, string>> = [
            { handle: 'filesystem' },
            { src: `^${opts.apiPath}/(.*)$`, dest: '/api' },
          ]
          if (staticDir) {
            if (!existsSync(staticDir)) {
              throw new Error(
                `build:vercel: ${staticDir} does not exist — build the frontend first`,
              )
            }
            cpSync(staticDir, resolve(output, 'static'), { recursive: true })
            // Client-side routes fall back to the SPA shell.
            routes.push({ src: '^/(.*)$', dest: '/index.html' })
          }
          writeFileSync(
            resolve(output, 'config.json'),
            JSON.stringify({ version: 3, routes }, null, 2),
          )
          ctx.log(`wrote ${relative(process.cwd(), output)}`)
        })
    },
  })
