import { defineCommand, runMain } from 'citty'
import * as FSExtra from 'fs-extra'
import { readFileSync } from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

const version = getPackageVersion()

const main = defineCommand({
  meta: {
    name: 'main',
    version: version,
    description: 'Strip',
  },
  args: {
    target: {
      type: 'positional',
      description: 'Folder to strip',
      required: true,
    },
    destination: {
      type: 'positional',
      description: 'Output folder',
      default: '.',
      required: false,
    },
    overwrite: {
      type: 'boolean',
      default: false,
    },
  },
  async run({ args }) {
    console.warn(`Stripping`, args.target, args.destination)

    if (args.overwrite) {
      await FSExtra.remove(args.destination)
    }

    await FSExtra.mkdirp(dirname(args.target))

    await FSExtra.copy(args.target, args.destination, {
      recursive: true,
      filter: (src) => !src.includes('node_modules'),
    })

    const { text } = await generateText({
      model: google('models/gemini-2.0-flash-exp'),
      prompt: 'What is love?',
    })

    console.info(`got`, text)
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
  const packagePath = path.join(dirname, '..', 'package.json')
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'))
  return packageJson.version
}
