import { defineCommand, runMain } from 'citty'
import { default as FSExtra } from 'fs-extra'
import { readFileSync } from 'node:fs'
import path, { dirname, extname, relative } from 'node:path'
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
      filter: (srcIn) => {
        const src = relative(relative(process.cwd(), args.target), srcIn)
        return (
          !src.endsWith('.DS_Store') &&
          !src.includes('node_modules') &&
          !src.startsWith('dist') &&
          !src.startsWith('.expo')
        )
      },
    })

    async function llm(prompt: string) {
      console.warn(`calling llm with prompt`, prompt.length, `:`, prompt.slice(0, 40) + '...')

      const { text } = await generateText({
        model: google('models/gemini-2.0-flash-exp'),
        prompt,
      })
      return text
    }

    const codebase = await processCodebase(args.destination)

    const out = await llm(`
You are a bot that helps distill codebases down from the full codebase into a starter kit for a software developer to use.

Below is a description of the codebase, with an index of the files, and then the contents of the code-like files.

Each section is separated with "---". At the end, the developer will give you a prompt to take action on.

- Do NOT add any new code, your only job is to remove code
- Do NOT modify existing functions, simply remove them
- Do NOT make refactors, just removals

---
      
${codebase}

---

Developer prompt:

Lets keep the interface elements and the chat-related screens, and leave just the general structure.
We want to keep the infrastructure, postgres, docker, etc. Keep the general structure, tamagui, layouts.
But remove the chat-specific interfaces so we can use this starter to build a different type of app.

---

To start, first write a plan on what you will remove here in plain english (5 sentences or so).

Then, add a "---" and create a new Index. Leave out the summary after ":".

Then, add a "---" and then add the files.

  - If the file isn't changed, don't output it at all.
  - If the file needs changes, output the file contents in full.

---

`)

    console.log('wtf', out)

    type Entry = { name: string; summary: string; indent: number; type: 'file' | 'folder' }

    async function buildIndex(rootDir: string, indentLevel = 0): Promise<Entry[]> {
      const items = await FSExtra.readdir(rootDir, { withFileTypes: true })
      const index: Entry[] = []

      for (const item of items) {
        const type = item.isDirectory() ? 'folder' : 'file'
        const entry = {
          name: item.name,
          summary: '',
          indent: indentLevel,
          type,
        } satisfies Entry

        index.push(entry)

        if (type === 'folder') {
          const dirPath = path.join(rootDir, item.name)
          const readmePath = path.join(dirPath, 'README.md')

          if (await FSExtra.pathExists(readmePath)) {
            console.info(`Found readme at`, readmePath)
            const readmeContent = await FSExtra.readFile(readmePath, 'utf8')
            const summary = await llm(
              `Summarize this into 2 sentences with no formatting: ${readmeContent}`
            )
            index[index.length - 1].summary = summary
          }

          const subIndex = await buildIndex(dirPath, indentLevel + 1)
          index.push(...subIndex)
        }
      }

      return index
    }

    // Function to read and process the codebase
    async function processCodebase(rootDir: string) {
      let output = ''

      const index = await buildIndex(rootDir)

      output += '## Index\n\n'
      for (const { name, summary, indent, type } of index) {
        const indentStr = '  '.repeat(indent) // 2 spaces per indent level
        output += `${indentStr}- ${type === 'folder' ? '📁' : '📋'} ${name}${summary ? `: ${summary}` : ``}\n`
      }
      output += '\n---\n\n'
      output += `## Files\n\n`

      async function processDirectory(dirPath: string) {
        const items = await FSExtra.readdir(dirPath, { withFileTypes: true })

        for (const item of items) {
          const itemPath = path.join(dirPath, item.name)

          if (item.isDirectory()) {
            await processDirectory(itemPath)
          } else if (item.isFile() && item.name !== 'README.md') {
            const extension = extname(item.name)
            if (['.ts', '.tsx', '.js', '.css'].includes(extension)) {
              const fileContent = await FSExtra.readFile(itemPath, 'utf8')
              const relativePath = path.relative(rootDir, itemPath)
              const ext = path.extname(item.name).slice(1)
              output += `\`\`\`${ext} fileName=${relativePath}\n${fileContent}\n\`\`\`\n\n`
            }
          }
        }
      }

      await processDirectory(rootDir)

      return output
    }
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
