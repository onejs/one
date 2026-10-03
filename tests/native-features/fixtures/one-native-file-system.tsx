import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeFileSystem() {
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState('none')

  async function run() {
    setStatus('running')
    let stage = 'directories'
    try {
      const fs = One.iOS.FileSystem
      const directories = fs.getDirectories()
      stage = 'path'
      const dir = new URL(`one-native-file-system-${Date.now()}/`, directories.cache).href
      const note = new URL('note.txt', dir).href
      const copy = new URL('copy.txt', dir).href
      const moved = new URL('moved.txt', dir).href
      const binary = new URL('binary.dat', dir).href
      const nested = new URL('nested/child/', dir).href

      stage = 'makeDirectory'
      await fs.makeDirectory(dir)
      stage = 'writeFile'
      await fs.writeFile(note, 'héllo 👋')
      const unicodeText = await (await fetch(note)).text()
      const unicodeInfo = await fs.getInfo(note)
      if (unicodeText !== 'héllo 👋' || unicodeInfo.size !== 11) {
        throw new Error('UTF-8 byte size did not match')
      }
      stage = 'overwrite'
      await fs.writeFile(note, 'Hello One')
      stage = 'fetchText'
      const text = await (await fetch(note)).text()
      stage = 'getInfo'
      const noteInfo = await fs.getInfo(note)
      if (text !== 'Hello One' || noteInfo.size !== 9 || !noteInfo.modifiedAt) {
        throw new Error('text write or file info did not match')
      }

      stage = 'copyMove'
      await fs.copy(note, copy)
      await fs.move(copy, moved)
      const movedInfo = await fs.getInfo(moved)
      if (!movedInfo.exists || (await fs.getInfo(copy)).exists) {
        throw new Error('copy or move did not match')
      }
      stage = 'existing destination'
      let existingError = ''
      try {
        await fs.copy(note, moved)
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error)
          existingError = String(error.code)
      }
      stage = 'nested directory'
      await fs.makeDirectory(nested)
      const nestedInfo = await fs.getInfo(nested)
      if (!nestedInfo.exists || !nestedInfo.isDirectory) {
        throw new Error('intermediate directory did not match')
      }
      await fs.writeFile(new URL('child.txt', nested).href, 'nested')
      await fs.delete(new URL('nested/', dir).href)
      const recursive = !(await fs.getInfo(nested)).exists

      stage = 'base64'
      await fs.writeFile(binary, 'AAECAw==', 'base64')
      const bytes = Array.from(
        new Uint8Array(await (await fetch(binary)).arrayBuffer())
      ).join(',')
      const entries = (await fs.readDirectory(dir)).map((entry) => entry.name).join(',')
      let encodingError = ''
      try {
        await fs.writeFile(new URL('bad.dat', dir).href, '!?', 'base64')
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error)
          encodingError = String(error.code)
      }
      let rootError = ''
      try {
        await fs.delete(directories.cache)
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error)
          rootError = String(error.code)
      }

      let invalidURI = ''
      try {
        await fs.getInfo('https://example.com/file.txt')
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error)
          invalidURI = String(error.code)
      }

      stage = 'delete'
      await fs.delete(note)
      await fs.delete(moved)
      await fs.delete(binary)
      await fs.delete(dir)
      const missing = await fs.getInfo(dir)
      let missingError = ''
      try {
        await fs.delete(note)
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error)
          missingError = String(error.code)
      }

      setResult(
        `text=${text}; bytes=${bytes}; entries=${entries}; moved=${movedInfo.exists}; ` +
          `recursive=${recursive}; missing=${missing.exists}; ` +
          `errors=${invalidURI},${missingError},${existingError},${encodingError},${rootError}`
      )
      setStatus('passed')
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
      setStatus(
        `error at ${stage}: ${code} ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return (
    <View style={styles.screen}>
      <Text testID="one-native-file-system-status">Status: {status}</Text>
      <Text testID="one-native-file-system-result">Result: {result}</Text>
      <Pressable testID="one-native-file-system-run" style={styles.chip} onPress={run}>
        <Text>Run file lifecycle</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})

export interface FileSystemBenchmarkAdapter {
  write(uri: string, value: string): Promise<void>
  info(uri: string): Promise<{ size: number }>
  copy(from: string, to: string): Promise<void>
  remove(uri: string): Promise<void>
}

export async function benchmarkFileSystem(
  adapter: FileSystemBenchmarkAdapter,
  root: string
) {
  const { timeAsync } = await import('./native-speed')
  const small = root + 'small.txt'
  const large = root + 'large.txt'
  await adapter.write(small, 'v'.repeat(4096))
  await adapter.write(large, 'v'.repeat(1024 * 1024))
  const write4KB = await timeAsync(100, () => adapter.write(small, 'v'.repeat(4096)))
  const stat = await timeAsync(100, () => adapter.info(small))
  const copy1MB = await timeAsync(25, async (index) => {
    const uri = root + `copy-${index}.txt`
    await adapter.copy(large, uri)
  })
  if (
    (await adapter.info(small)).size !== 4096 ||
    (await adapter.info(large)).size !== 1024 * 1024
  ) {
    throw new Error('file benchmark source bytes did not match')
  }
  for (let index = 0; index < 25; index++) {
    const uri = root + `copy-${index}.txt`
    if ((await adapter.info(uri)).size !== 1024 * 1024)
      throw new Error('file copy lost bytes')
    await adapter.remove(uri)
  }
  await adapter.remove(small)
  await adapter.remove(large)
  return { write4KB, stat, copy1MB }
}
