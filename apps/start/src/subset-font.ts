import { readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import subsetFont from 'subset-font'

export async function subset({
  inputFiles,
  characters,
  outputDir,
  targetFormat,
}: {
  outputDir: string
  targetFormat: 'woff2' | 'sfnt' | 'woff' | 'truetype'
  inputFiles: string[]
  characters: string
}) {
  console.info(`Subsetting`, inputFiles)
  await Promise.all(
    inputFiles.map(async (file) => {
      const font = await readFile(file)
      const buffer = await subsetFont(font, characters, {
        targetFormat,
      })
      const fileBaseName = basename(file).replace(/\..*/, '')
      const outPath = join(outputDir, fileBaseName + `.${targetFormat}`)
      await writeFile(outPath, buffer)
    })
  )
}

subset({
  inputFiles: ['./src/fonts/GeistMono-Regular.otf'],
  outputDir: './src/fonts',
  targetFormat: 'woff2',
  characters: `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()-=_+{}[]|\\/.,<>;:'"\``,
})

subset({
  inputFiles: ['./src/fonts/GeistMono-Black.otf'],
  outputDir: './src/fonts',
  targetFormat: 'woff2',
  characters: `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()-=_+{}[]|\\/.,<>;:'"\``,
})

subset({
  inputFiles: ['./src/fonts/AderBold.otf'],
  outputDir: './src/fonts',
  targetFormat: 'woff2',
  characters: `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()-=_+{}[]|\\/.,<>;:'"\``,
})
