#!/usr/bin/env node
// inspired by https://github.com/vercel/next.js/blob/0355e5f63f87db489f36db8d814958cb4c2b828b/packages/create-next-app/helpers/examples.ts#L71

import ansis from 'ansis'
import { defineCommand, runMain } from 'citty'
import path from 'node:path'
import { cwd } from 'node:process'
import { getTemplateInfo } from './helpers/getTemplateInfo'
import { create } from './create'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

let projectPath = ''

function exit() {
  process.exit(0)
}

process.on('SIGTERM', exit)
process.on('SIGINT', exit)

const main = defineCommand({
  meta: {
    name: 'main',
    version: '0.0.0',
    description: 'Welcome to vxrn',
  },
  args: {
    directory: {
      type: 'positional',
      description: 'Directory to copy into',
      default: '',
    },
    template: {
      type: 'string',
      required: false,
      description: 'One of "bare", "tamagui", "router".',
    },
    info: {
      type: 'boolean',
      description: 'Output the post-install instructions for the template.',
    },
  },
  async run({ args }) {
    if (args.info) {
      let template = await getTemplateInfo(args.template)
      if ('extraSteps' in template) {
        await template.extraSteps({
          isFullClone: false,
          projectName: path.basename(cwd()),
          projectPath: cwd(),
        })
      }
      return
    }

    console.info()
    console.info(
      ansis.bold(' Note: You may need to run "npm create vxrn@latest" to get the latest version!')
    )
    console.info()

    console.info() // this newline prevents the ascii art from breaking
    console.info(ansis.bold('Creating vxrn app...'))

    await create({ template: args.template })
  },
})

runMain(main)

function getPackageVersion() {
  let dirname
  if (typeof __dirname !== 'undefined') {
    // CommonJS
    dirname = __dirname
  } else {
    // ESM
    dirname = path.dirname(fileURLToPath(import.meta.url))
  }
  const packagePath = path.join(dirname, '..', '..', 'package.json')
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'))
  return packageJson.version
}

if (process.argv.includes('--version')) {
  console.info(getPackageVersion())
  process.exit(0)
}
