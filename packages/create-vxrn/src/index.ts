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

const main = defineCommand({
  meta: {
    name: 'create-vxrn',
    version: getPackageVersion(),
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
      description: 'Choose a template in advance (avoid selection screen).',
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

    console.info() // this newline prevents the ascii art from breaking
    console.info(ansis.bold('Creating vxrn app...'))

    await create({ name: args.directory, template: args.template })
  },
})

runMain(main)
