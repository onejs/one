import { defineCommand, runMain } from 'citty'
import { default as FSExtra } from 'fs-extra'
import { readFileSync } from 'node:fs'
import path, { dirname, relative } from 'node:path'
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
        return !src.includes('node_modules') && !src.startsWith('dist') && !src.startsWith('.expo')
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

    return

    const codebase = await processCodebase(args.destination)

    console.log('wtf', codebase)

    async function buildIndex(
      rootDir: string,
      indentLevel = 0
    ): Promise<{ name: string; summary: string; indent: number }[]> {
      const items = await FSExtra.readdir(rootDir, { withFileTypes: true })
      const index: { name: string; summary: string; indent: number }[] = []

      for (const item of items) {
        if (item.isDirectory()) {
          const dirPath = path.join(rootDir, item.name)
          const readmePath = path.join(dirPath, 'README.md')

          // Add the directory to the index
          index.push({
            name: item.name,
            summary: '',
            indent: indentLevel,
          })

          // Check for README.md and summarize it
          if (await FSExtra.pathExists(readmePath)) {
            console.info(`Found readme at`, readmePath)
            const readmeContent = await FSExtra.readFile(readmePath, 'utf8')
            const summary = await llm(
              `Summarize this into 2 sentences with no formatting: ${readmeContent}`
            )
            index[index.length - 1].summary = summary
          }

          // Recursively process subdirectories
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
      for (const { name, summary, indent } of index) {
        const indentStr = '  '.repeat(indent) // 2 spaces per indent level
        output += `${indentStr}- **${name}**: ${summary}\n`
      }
      output += '\n---\n\n'

      async function processDirectory(dirPath: string) {
        const items = await FSExtra.readdir(dirPath, { withFileTypes: true })

        for (const item of items) {
          const itemPath = path.join(dirPath, item.name)

          if (item.isDirectory()) {
            await processDirectory(itemPath)
          } else if (item.isFile() && item.name !== 'README.md') {
            const fileContent = '' //tmp comment out to avoid huge  //await FSExtra.readFile(itemPath, 'utf8')
            const relativePath = path.relative(rootDir, itemPath)
            const ext = path.extname(item.name).slice(1)
            output += `\`\`\`${ext} fileName=${relativePath}\n${fileContent}\n\`\`\`\n\n`
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
