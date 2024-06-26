import { defineCommand } from 'citty'
import { serve } from './vite'

export const serveCommand = defineCommand({
  meta: {
    name: 'serve',
    version: '0.0.0',
    description: 'Serve a built app for production',
  },
  args: {
    host: {
      type: 'string',
    },
    port: {
      type: 'string',
    },
  },
  async run({ args }) {
    const { serve: vxrnServe } = await import('vxrn')

    process.on('uncaughtException', (err) => {
      console.error(err?.message || err)
    })

    await vxrnServe({
      port: args.port ? +args.port : undefined,
      host: args.host,
      afterServerStart(options, app) {
        serve(options as any, app)
      },
    })
  },
})
