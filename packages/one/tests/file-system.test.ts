import { afterEach, describe, expect, it, vi } from 'vitest'
import { FileSystem } from '../src/platform/file-system/index'
import { PathUtilities } from '../src/platform/file-system/paths'
import {
  FileSystemReadableStreamSource,
  FileSystemWritableSink,
} from '../src/platform/file-system/streams'
import { FileMode } from '../src/platform/file-system/types'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: vi.fn() },
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function loadNativeClasses(hybrid: unknown) {
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.createHybridObject).mockReturnValue(hybrid as never)
  return import('../src/platform/file-system/classes.native')
}

// an in-memory hybrid standing in for the native module. it stores bytes and
// answers each method's contract; assertions target js mapping, validation
// and uri updates, never native filesystem semantics.
function fakeHybrid() {
  type Node = { dir: boolean; bytes: Uint8Array; modified: number; created: number }
  const store = new Map<string, Node>()
  const key = (uri: string) => new URL(uri).pathname
  const handles = new Map<number, { key: string; offset: number; mode: string }>()
  let next = 1
  const fail = (code: string, verb: string, detail: string): never => {
    throw Object.assign(new Error(`${code}: FileSystem.${verb}: ${detail}`), { code })
  }
  return {
    store,
    hybrid: {
      getDirectories: () => ({
        documents: 'file:///documents/',
        cache: 'file:///cache/',
        applicationSupport: 'file:///support/',
        temporary: 'file:///tmp/',
      }),
      getBundleDirectory: () => 'file:///bundle/',
      getDiskSpace: () => ({ available: 1000, total: 2000 }),
      pathInfo: (uri: string) => {
        const node = store.get(key(uri))
        return { exists: !!node, isDirectory: node ? node.dir : undefined }
      },
      readText: (uri: string) => new TextDecoder().decode(store.get(key(uri))?.bytes ?? fail('E_FILE_NOT_FOUND', 'readText', 'missing')),
      readTextAsync: async (uri: string) =>
        new TextDecoder().decode(store.get(key(uri))?.bytes ?? fail('E_FILE_NOT_FOUND', 'readText', 'missing')),
      readData: (uri: string) =>
        (store.get(key(uri))?.bytes ?? fail('E_FILE_NOT_FOUND', 'readData', 'missing')).slice().buffer,
      readDataAsync: async (uri: string) =>
        (store.get(key(uri))?.bytes ?? fail('E_FILE_NOT_FOUND', 'readData', 'missing')).slice().buffer,
      readBase64: (uri: string) => Buffer.from(store.get(key(uri))?.bytes ?? fail('E_FILE_NOT_FOUND', 'readBase64', 'missing')).toString('base64'),
      readBase64Async: async (uri: string) =>
        Buffer.from(store.get(key(uri))?.bytes ?? fail('E_FILE_NOT_FOUND', 'readBase64', 'missing')).toString('base64'),
      writeText: (uri: string, contents: string, encoding: string, append: boolean) => {
        const bytes =
          encoding === 'base64'
            ? new Uint8Array(Buffer.from(contents, 'base64'))
            : new TextEncoder().encode(contents)
        const k = key(uri)
        const prior = append ? (store.get(k)?.bytes ?? new Uint8Array()) : new Uint8Array()
        const nextBytes = new Uint8Array(prior.length + bytes.length)
        nextBytes.set(prior)
        nextBytes.set(bytes, prior.length)
        store.set(k, { dir: false, bytes: nextBytes, modified: 2, created: 1 })
      },
      writeTextAsync: async (uri: string, contents: string, encoding: string, append: boolean) => {
        const bytes =
          encoding === 'base64'
            ? new Uint8Array(Buffer.from(contents, 'base64'))
            : new TextEncoder().encode(contents)
        const k = key(uri)
        const prior = append ? (store.get(k)?.bytes ?? new Uint8Array()) : new Uint8Array()
        const nextBytes = new Uint8Array(prior.length + bytes.length)
        nextBytes.set(prior)
        nextBytes.set(bytes, prior.length)
        store.set(k, { dir: false, bytes: nextBytes, modified: 2, created: 1 })
      },
      writeData: (uri: string, bytes: ArrayBuffer, append: boolean) => {
        const k = key(uri)
        const incoming = new Uint8Array(bytes)
        const prior = append ? (store.get(k)?.bytes ?? new Uint8Array()) : new Uint8Array()
        const nextBytes = new Uint8Array(prior.length + incoming.length)
        nextBytes.set(prior)
        nextBytes.set(incoming, prior.length)
        store.set(k, { dir: false, bytes: nextBytes, modified: 2, created: 1 })
      },
      writeDataAsync: async (uri: string, bytes: ArrayBuffer, append: boolean) => {
        const k = key(uri)
        const incoming = new Uint8Array(bytes)
        const prior = append ? (store.get(k)?.bytes ?? new Uint8Array()) : new Uint8Array()
        const nextBytes = new Uint8Array(prior.length + incoming.length)
        nextBytes.set(prior)
        nextBytes.set(incoming, prior.length)
        store.set(k, { dir: false, bytes: nextBytes, modified: 2, created: 1 })
      },
      fileDigest: async () => 'digest',
      createFileEntry: (uri: string) => {
        store.set(key(uri), { dir: false, bytes: new Uint8Array(), modified: 2, created: 1 })
      },
      createDirectoryEntry: (uri: string) => {
        store.set(key(uri), { dir: true, bytes: new Uint8Array(), modified: 2, created: 1 })
      },
      createFileInDirectory: (dirUri: string, name: string) => `${dirUri}${name}`,
      createSubdirectory: (dirUri: string, name: string) => `${dirUri}${name}/`,
      deleteEntry: (uri: string) => {
        if (!store.delete(key(uri))) fail('E_FILE_NOT_FOUND', 'deleteEntry', 'missing')
      },
      renameEntry: (uri: string, newName: string) => {
        const url = new URL(uri)
        url.pathname = `${url.pathname.split('/').slice(0, -1).join('/')}/${newName}`
        const node = store.get(key(uri))
        if (node) {
          store.delete(key(uri))
          store.set(key(url.href), node)
        }
        return url.href
      },
      copyEntry: (fromUri: string, toUri: string) => {
        const node = store.get(key(fromUri))
        if (node) store.set(key(toUri), { ...node, bytes: node.bytes.slice() })
      },
      copyEntryAsync: async (fromUri: string, toUri: string) => {
        const node = store.get(key(fromUri))
        if (node) store.set(key(toUri), { ...node, bytes: node.bytes.slice() })
      },
      moveEntry: (fromUri: string, toUri: string) => {
        const node = store.get(key(fromUri))
        if (node) {
          store.delete(key(fromUri))
          store.set(key(toUri), node)
        }
      },
      moveEntryAsync: async (fromUri: string, toUri: string) => {
        const node = store.get(key(fromUri))
        if (node) {
          store.delete(key(fromUri))
          store.set(key(toUri), node)
        }
      },
      listEntries: (uri: string) => {
        const prefix = key(uri).replace(/\/$/, '') + '/'
        const out: { name: string; uri: string; isDirectory: boolean }[] = []
        for (const [k, node] of store) {
          if (!k.startsWith(prefix)) continue
          const rest = k.slice(prefix.length)
          if (!rest || rest.includes('/')) continue
          out.push({ name: rest, uri: `file://${k}`, isDirectory: node.dir })
        }
        return out.sort((a, b) => (a.name < b.name ? -1 : 1))
      },
      fileDetails: (uri: string) => {
        const node = store.get(key(uri))
        if (!node) return { exists: false, size: 0, mimeType: '' }
        return {
          exists: true,
          size: node.bytes.length,
          modificationTime: node.modified,
          creationTime: node.created,
          mimeType: uri.endsWith('.txt') ? 'text/plain' : '',
        }
      },
      directoryDetails: (uri: string) => {
        const node = store.get(key(uri))
        if (!node) return { exists: false }
        return {
          exists: true,
          size: 7,
          modificationTime: node.modified,
          creationTime: node.created,
          files: ['a.txt'],
        }
      },
      openFile: (uri: string, mode: string) => {
        const id = next++
        handles.set(id, { key: key(uri), offset: mode === 'wa' ? 99 : 0, mode })
        return id
      },
      closeFile: (handle: number) => {
        handles.delete(handle)
      },
      readHandle: (handle: number, length: number) => {
        const state = handles.get(handle)!
        const bytes = store.get(state.key)?.bytes ?? new Uint8Array()
        const slice = bytes.slice(state.offset, state.offset + length)
        state.offset += slice.length
        return slice.buffer as ArrayBuffer
      },
      readHandleAsync: async (handle: number, length: number) => {
        const state = handles.get(handle)!
        const bytes = store.get(state.key)?.bytes ?? new Uint8Array()
        const slice = bytes.slice(state.offset, state.offset + length)
        state.offset += slice.length
        return slice.buffer as ArrayBuffer
      },
      writeHandle: (handle: number, bytes: ArrayBuffer) => {
        const state = handles.get(handle)!
        const incoming = new Uint8Array(bytes)
        const prior = store.get(state.key)?.bytes ?? new Uint8Array()
        const nextBytes = new Uint8Array(Math.max(prior.length, state.offset + incoming.length))
        nextBytes.set(prior)
        nextBytes.set(incoming, state.offset)
        store.set(state.key, { dir: false, bytes: nextBytes, modified: 2, created: 1 })
        state.offset += incoming.length
      },
      writeHandleAsync: async (handle: number, bytes: ArrayBuffer) => {
        const state = handles.get(handle)!
        const incoming = new Uint8Array(bytes)
        const prior = store.get(state.key)?.bytes ?? new Uint8Array()
        const nextBytes = new Uint8Array(Math.max(prior.length, state.offset + incoming.length))
        nextBytes.set(prior)
        nextBytes.set(incoming, state.offset)
        store.set(state.key, { dir: false, bytes: nextBytes, modified: 2, created: 1 })
        state.offset += incoming.length
      },
      getHandleOffset: (handle: number) => handles.get(handle)!.offset,
      setHandleOffset: (handle: number, offset: number) => {
        handles.get(handle)!.offset = offset
      },
      getHandleSize: (handle: number) =>
        (store.get(handles.get(handle)!.key)?.bytes.length ?? 0),
    },
  }
}

describe('Paths utilities', () => {
  it('joins a directory instance with segments into a uri', async () => {
    const { Directory } = await loadNativeClasses(fakeHybrid().hybrid)
    const cache = new Directory('file:///cache/')
    expect(PathUtilities.join(cache, 'sub', 'note.txt')).toBe('file:///cache/sub/note.txt')
    expect(PathUtilities.join('file:///cache/', 'sub/', 'note.txt')).toBe(
      'file:///cache/sub/note.txt'
    )
  })

  it('joins bare paths without a scheme', () => {
    expect(PathUtilities.join('a', 'b', 'c.txt')).toBe('a/b/c.txt')
    expect(PathUtilities.join('/a/', '../b')).toBe('/b')
  })

  it('encodes spaces and query characters in joined segments', async () => {
    const { Directory } = await loadNativeClasses(fakeHybrid().hybrid)
    expect(PathUtilities.join(new Directory('file:///cache/'), 'my note?.txt')).toBe(
      'file:///cache/my%20note%3F.txt'
    )
  })

  it('returns dirnames and basenames from uris', () => {
    expect(PathUtilities.dirname('file:///cache/sub/note.txt')).toBe('file:///cache/sub')
    expect(PathUtilities.basename('file:///cache/sub/note.txt')).toBe('note.txt')
    expect(PathUtilities.basename('file:///cache/sub/')).toBe('sub')
    expect(PathUtilities.extname('file:///cache/note.txt')).toBe('.txt')
    expect(PathUtilities.extname('file:///cache/note')).toBe('')
  })

  it('parses a uri into path components', () => {
    expect(PathUtilities.parse('file:///cache/sub/note.txt')).toEqual({
      root: '/',
      dir: '/cache/sub',
      base: 'note.txt',
      ext: '.txt',
      name: 'note',
    })
  })

  it('normalizes dot segments inside uris', () => {
    expect(PathUtilities.normalize('file:///cache/sub/../note.txt')).toBe('file:///cache/note.txt')
  })

  it('resolves relative paths between uris', () => {
    expect(PathUtilities.relative('file:///cache/a/', 'file:///cache/a/b/c.txt')).toBe('b/c.txt')
    expect(PathUtilities.relative('file:///cache/a/b', 'file:///cache/c')).toBe('../../c')
  })

  it('detects absolute paths and uris', () => {
    expect(PathUtilities.isAbsolute('file:///cache/a')).toBe(true)
    expect(PathUtilities.isAbsolute('/cache/a')).toBe(true)
    expect(PathUtilities.isAbsolute('cache/a')).toBe(false)
  })
})

describe('native File', () => {
  it('builds a uri from mixed segments', async () => {
    const { File, Directory } = await loadNativeClasses(fakeHybrid().hybrid)
    const file = new File(new Directory('file:///cache/'), 'sub', 'note.txt')
    expect(file.uri).toBe('file:///cache/sub/note.txt')
    expect(file.name).toBe('note.txt')
    expect(file.extension).toBe('.txt')
    expect(file.parentDirectory.uri).toBe('file:///cache/sub')
    expect(new File(file).uri).toBe('file:///cache/sub/note.txt')
  })

  it('rejects relative and non-file uris', async () => {
    const { File } = await loadNativeClasses(fakeHybrid().hybrid)
    expect(() => new File('note.txt')).toThrow('File: expected an absolute file uri')
    expect(() => new File('https://example.com/note.txt')).toThrow(
      'File: expected an absolute file uri'
    )
    expect(() => new File()).toThrow('File: expected an absolute file uri')
  })

  it('reads details, text, bytes and base64 through both twins', async () => {
    const { File } = await loadNativeClasses(fakeHybrid().hybrid)
    const file = new File('file:///cache/note.txt')
    await file.write('héllo')
    expect(file.exists).toBe(true)
    expect(file.size).toBe(6)
    expect(file.type).toBe('text/plain')
    expect(file.lastModified).toBe(2)
    expect(file.creationTime).toBe(1)
    expect(await file.text()).toBe('héllo')
    expect(file.textSync()).toBe('héllo')
    expect(Array.from(await file.bytes())).toEqual([104, 195, 169, 108, 108, 111])
    expect(Array.from(file.bytesSync())).toEqual([104, 195, 169, 108, 108, 111])
    expect(await file.base64()).toBe(Buffer.from('héllo', 'utf8').toString('base64'))
    expect(file.base64Sync()).toBe(Buffer.from('héllo', 'utf8').toString('base64'))
    expect(await file.arrayBuffer()).toBeInstanceOf(ArrayBuffer)
    expect(file.info()).toEqual({
      exists: true,
      uri: 'file:///cache/note.txt',
      size: 6,
      modificationTime: 2,
      creationTime: 1,
    })
  })

  it('reports missing files with empty values', async () => {
    const { File } = await loadNativeClasses(fakeHybrid().hybrid)
    const file = new File('file:///cache/missing.txt')
    expect(file.exists).toBe(false)
    expect(file.size).toBe(0)
    expect(file.type).toBe('')
    expect(file.lastModified).toBeNull()
    expect(file.info()).toEqual({ exists: false, uri: 'file:///cache/missing.txt' })
  })

  it('restores the native code on read failures', async () => {
    const { File } = await loadNativeClasses(fakeHybrid().hybrid)
    const file = new File('file:///cache/missing.txt')
    await expect(file.text()).rejects.toMatchObject({ code: 'E_FILE_NOT_FOUND' })
    expect(() => file.textSync()).toThrow(expect.objectContaining({ code: 'E_FILE_NOT_FOUND' }))
  })

  it('parses json and digests with a validated algorithm', async () => {
    const { File } = await loadNativeClasses(fakeHybrid().hybrid)
    const file = new File('file:///cache/data.json')
    await file.write('{"a":1}')
    expect(await file.json()).toEqual({ a: 1 })
    expect(await file.digest('SHA-256')).toBe('digest')
    expect(() => (file as { digest: (a: string) => unknown }).digest('CRC32')).toThrow(
      'File.digest: expected a digest algorithm'
    )
  })

  it('writes strings, bytes and buffers with encoding and append', async () => {
    const { File } = await loadNativeClasses(fakeHybrid().hybrid)
    const file = new File('file:///cache/out.bin')
    file.writeSync(new Uint8Array([1, 2]))
    expect(Array.from(file.bytesSync())).toEqual([1, 2])
    await file.write(new Uint8Array([3]).buffer, { append: true })
    expect(Array.from(file.bytesSync())).toEqual([1, 2, 3])
    await file.write('QUJD', { encoding: 'base64' })
    expect(await file.text()).toBe('ABC')
    expect(() => file.writeSync(7 as never)).toThrow(
      'File.writeSync: expected a string, Uint8Array or ArrayBuffer'
    )
    expect(() => file.writeSync('x', { encoding: 'utf16' as never })).toThrow(
      "File.writeSync: expected encoding 'utf8' or 'base64'"
    )
  })

  it('creates, deletes, copies and moves with uri updates', async () => {
    const { File, Directory } = await loadNativeClasses(fakeHybrid().hybrid)
    const file = new File('file:///cache/a.txt')
    file.create()
    expect(file.exists).toBe(true)
    const dir = new Directory('file:///cache/sub/')
    await file.copy(dir)
    expect(new File('file:///cache/sub/a.txt').exists).toBe(true)
    await file.copy(new File('file:///cache/b.txt'))
    const moved = new File('file:///cache/m.txt')
    moved.create()
    await moved.move(new File('file:///cache/n.txt'))
    expect(moved.uri).toBe('file:///cache/n.txt')
    expect(new File('file:///cache/m.txt').exists).toBe(false)
    moved.moveSync(dir)
    expect(moved.uri).toBe('file:///cache/sub/n.txt')
    moved.rename('o.txt')
    expect(moved.uri).toBe('file:///cache/sub/o.txt')
    moved.delete()
    expect(moved.exists).toBe(false)
  })

  it('treats same-target moves and renames as no-ops', async () => {
    const { File } = await loadNativeClasses(fakeHybrid().hybrid)
    const file = new File('file:///cache/a.txt')
    file.create()
    await file.move(new File('file:///cache/a.txt'))
    file.moveSync(new File('file:///cache/a.txt'))
    file.rename('a.txt')
    expect(file.uri).toBe('file:///cache/a.txt')
    expect(file.exists).toBe(true)
  })

  it('validates names, modes and destinations', async () => {
    const { File } = await loadNativeClasses(fakeHybrid().hybrid)
    const file = new File('file:///cache/a.txt')
    expect(() => file.rename('sub/b.txt')).toThrow('File.rename: expected a single path segment')
    expect(() => file.open('xx' as never)).toThrow('File.open: expected a FileMode')
    expect(() => file.copy('/cache' as never)).toThrow(
      'File.copy: expected a File or Directory destination'
    )
  })
})

describe('native Directory', () => {
  it('resolves names, parents, lists and info', async () => {
    const { File, Directory } = await loadNativeClasses(fakeHybrid().hybrid)
    const dir = new Directory('file:///cache/sub/')
    dir.create()
    expect(dir.name).toBe('sub')
    expect(dir.parentDirectory.uri).toBe('file:///cache')
    expect(dir.exists).toBe(true)
    expect(dir.size).toBe(7)
    const file = new File(dir, 'a.txt')
    file.create()
    const listed = dir.list()
    expect(listed.map((entry) => entry.uri)).toEqual(['file:///cache/sub/a.txt'])
    expect(listed[0]).toBeInstanceOf(File)
    expect(dir.info()).toEqual({
      exists: true,
      uri: 'file:///cache/sub/',
      size: 7,
      modificationTime: 2,
      creationTime: 1,
      files: ['a.txt'],
    })
    const created = dir.createFile('b.txt', null)
    expect(created).toBeInstanceOf(File)
    const nested = dir.createDirectory('nested')
    expect(nested).toBeInstanceOf(Directory)
    expect(() => dir.createFile('x.txt', 7 as never)).toThrow(
      'Directory.createFile: expected a mime type string or null'
    )
  })

  it('reports missing directories as null size', async () => {
    const { Directory } = await loadNativeClasses(fakeHybrid().hybrid)
    const dir = new Directory('file:///cache/missing/')
    expect(dir.exists).toBe(false)
    expect(dir.size).toBeNull()
    expect(dir.info()).toEqual({ exists: false, uri: 'file:///cache/missing/' })
  })

  it('moves directories into file and directory destinations', async () => {
    const { File, Directory } = await loadNativeClasses(fakeHybrid().hybrid)
    const dir = new Directory('file:///cache/sub/')
    dir.create()
    await dir.move(new File('file:///cache/moved'))
    expect(dir.uri).toBe('file:///cache/moved')
    dir.rename('again')
    expect(dir.uri).toBe('file:///cache/again')
    dir.delete()
    expect(dir.exists).toBe(false)
  })
})

describe('native Paths', () => {
  it('exposes directories, disk space and path info', async () => {
    const { Paths, File } = await loadNativeClasses(fakeHybrid().hybrid)
    expect(Paths.cache.uri).toBe('file:///cache/')
    expect(Paths.document.uri).toBe('file:///documents/')
    expect(Paths.bundle.uri).toBe('file:///bundle/')
    expect(Paths.totalDiskSpace).toBe(2000)
    expect(Paths.availableDiskSpace).toBe(1000)
    const file = new File('file:///cache/a.txt')
    file.create()
    expect(Paths.info('file:///cache/a.txt')).toEqual({ exists: true, isDirectory: false })
    expect(Paths.info('file:///cache/missing')).toEqual({ exists: false, isDirectory: null })
  })
})

describe('native FileHandle', () => {
  it('reads, writes, seeks and reports size through both twins', async () => {
    const { File, FileMode } = await loadNativeClasses(fakeHybrid().hybrid)
    const file = new File('file:///cache/data.bin')
    file.writeSync(new Uint8Array([10, 20, 30, 40]))
    const handle = file.open(FileMode.ReadWrite)
    expect(handle.offset).toBe(0)
    expect(handle.size).toBe(4)
    expect(Array.from(handle.readBytesSync(2))).toEqual([10, 20])
    expect(handle.offset).toBe(2)
    handle.offset = 1
    expect(Array.from(await handle.readBytes(2))).toEqual([20, 30])
    handle.offset = 0
    await handle.writeBytes(new Uint8Array([7]))
    expect(Array.from(file.bytesSync())).toEqual([7, 20, 30, 40])
    handle.writeBytesSync(new Uint8Array([8, 9]))
    expect(Array.from(file.bytesSync())).toEqual([7, 8, 9, 40])
    handle.close()
    expect(handle.offset).toBeNull()
    expect(handle.size).toBeNull()
  })

  it('reads past the end as empty and closes idempotently', async () => {
    const { File, FileMode } = await loadNativeClasses(fakeHybrid().hybrid)
    const file = new File('file:///cache/data.bin')
    file.writeSync(new Uint8Array([1]))
    const handle = file.open(FileMode.ReadOnly)
    handle.offset = 5
    expect(Array.from(handle.readBytesSync(4))).toEqual([])
    handle.close()
    handle.close()
  })

  it('rejects closed handles, bad modes and bad ranges', async () => {
    const { File, FileMode } = await loadNativeClasses(fakeHybrid().hybrid)
    const file = new File('file:///cache/data.bin')
    file.create()
    const handle = file.open(FileMode.ReadOnly)
    handle.close()
    expect(() => handle.readBytesSync(1)).toThrow('FileHandle.readBytesSync: the handle is closed')
    expect(() => handle.readBytes(1)).toThrow('FileHandle.readBytes: the handle is closed')
    expect(() => {
      handle.offset = 1
    }).toThrow('FileHandle.offset: the handle is closed')
    const reader = file.open(FileMode.ReadOnly)
    expect(() => reader.writeBytesSync(new Uint8Array([1]))).toThrow(
      'FileHandle.writeBytesSync: the handle is not writable'
    )
    const writer = file.open(FileMode.WriteOnly)
    expect(() => writer.readBytesSync(1)).toThrow(
      'FileHandle.readBytesSync: the handle is not readable'
    )
    expect(() => reader.readBytesSync(-1)).toThrow(
      'FileHandle.readBytesSync: expected a nonnegative integer byte length'
    )
    expect(() => {
      reader.offset = -2
    }).toThrow('FileHandle.offset: expected a finite nonnegative offset')
    expect(() => writer.writeBytesSync('nope' as never)).toThrow(
      'FileHandle.writeBytesSync: expected a Uint8Array or ArrayBuffer'
    )
  })
})

describe('file streams', () => {
  it('reads a handle to the end in chunks and closes', async () => {
    let offset = 0
    const bytes = new Uint8Array([1, 2, 3, 4, 5])
    let closed = false
    const source = new FileSystemReadableStreamSource({
      readBytes: async (length: number) => {
        const slice = bytes.slice(offset, offset + Math.min(length, 2))
        offset += slice.length
        return slice as Uint8Array<ArrayBuffer>
      },
      writeBytes: async () => {},
      close: () => {
        closed = true
      },
    })
    const stream = new ReadableStream(source)
    const reader = stream.getReader()
    const chunks: number[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(...value)
    }
    expect(chunks).toEqual([1, 2, 3, 4, 5])
    expect(closed).toBe(true)
  })

  it('cancelling a read stream closes the handle', async () => {
    let closed = false
    const stream = new ReadableStream(
      new FileSystemReadableStreamSource({
        readBytes: async () => new Uint8Array([1]),
        writeBytes: async () => {},
        close: () => {
          closed = true
        },
      })
    )
    await stream.cancel()
    expect(closed).toBe(true)
  })

  it('a rejected stream read still closes the owned native handle once', async () => {
    const closeFile = vi.fn()
    const { File } = await loadNativeClasses({
      openFile: () => 1,
      closeFile,
      readHandleAsync: async () => {
        throw Object.assign(new Error('E_FILE_FAILED: FileSystem.readHandle: boom'), {
          code: 'E_FILE_FAILED',
        })
      },
    })
    const reader = new File('file:///cache/probe.bin').readableStream().getReader()
    const failure = await reader.read().then(
      () => null,
      (error) => error as { code?: string }
    )
    expect(failure?.code).toBe('E_FILE_FAILED')
    expect(closeFile).toHaveBeenCalledTimes(1)
  })

  it('a rejected stream write still closes the owned handle once', async () => {
    let closes = 0
    const stream = new WritableStream(
      new FileSystemWritableSink({
        readBytes: async () => new Uint8Array(),
        writeBytes: async () => {
          throw new Error('E_FILE_FAILED: FileSystem.writeHandle: boom')
        },
        close: () => {
          closes += 1
        },
      })
    )
    await expect(stream.getWriter().write(new Uint8Array([1]))).rejects.toThrow(
      'E_FILE_FAILED'
    )
    expect(closes).toBe(1)
  })

  it('writes chunks through the sink and closes the handle', async () => {
    const written: number[] = []
    let closed = false
    const stream = new WritableStream(
      new FileSystemWritableSink({
        readBytes: async () => new Uint8Array(),
        writeBytes: async (chunk: Uint8Array) => {
          written.push(...chunk)
        },
        close: () => {
          closed = true
        },
      })
    )
    const writer = stream.getWriter()
    await writer.write(new Uint8Array([1, 2]))
    await writer.write(new Uint8Array([3]))
    await writer.close()
    expect(written).toEqual([1, 2, 3])
    expect(closed).toBe(true)
  })

  it('streams a native file end to end', async () => {
    const { File } = await loadNativeClasses(fakeHybrid().hybrid)
    const file = new File('file:///cache/stream.bin')
    const writer = file.writableStream().getWriter()
    await writer.write(new Uint8Array([5, 6]))
    await writer.write(new Uint8Array([7]))
    await writer.close()
    const reader = file.readableStream().getReader()
    const chunks: number[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(...value)
    }
    expect(chunks).toEqual([5, 6, 7])
    expect(chunks.length).toBe(3)
    expect(file.textSync()).toBe('\u0005\u0006\u0007')
  })
})

// an in-memory origin private file system. it answers the handle protocol;
// assertions target one's opfs layer, never browser storage semantics.
function fakeOpfs() {
  type Dir = { dir: Map<string, Dir | { bytes: Uint8Array }> }
  const rootDir: Dir = { dir: new Map() }
  const domError = (name: string) => new DOMException(name, name)

  function writerFor(
    dir: Map<string, Dir | { bytes: Uint8Array }>,
    name: string,
    keep: boolean
  ) {
    let bytes = keep
      ? ((dir.get(name) as { bytes: Uint8Array } | undefined)?.bytes.slice() ?? new Uint8Array())
      : new Uint8Array()
    let cursor = keep ? bytes.length : 0
    let closed = false
    return {
      async write(chunk: unknown) {
        if (closed) throw domError('InvalidStateError')
        const place = (data: Uint8Array, at: number) => {
          const next = new Uint8Array(Math.max(bytes.length, at + data.length))
          next.set(bytes)
          next.set(data, at)
          bytes = next
          cursor = at + data.length
        }
        if (typeof chunk === 'string') {
          place(new TextEncoder().encode(chunk), cursor)
        } else if (chunk instanceof Blob) {
          place(new Uint8Array(await chunk.arrayBuffer()), cursor)
        } else if (chunk instanceof Uint8Array) {
          place(chunk, cursor)
        } else if (typeof chunk === 'object' && chunk !== null && 'type' in chunk) {
          const op = chunk as { type: string; position?: number; data?: unknown; size?: number }
          if (op.type === 'write') {
            const data =
              typeof op.data === 'string'
                ? new TextEncoder().encode(op.data)
                : op.data instanceof Blob
                  ? new Uint8Array(await op.data.arrayBuffer())
                  : (op.data as Uint8Array)
            place(data, op.position ?? cursor)
          } else if (op.type === 'seek') {
            cursor = op.position ?? 0
          } else if (op.type === 'truncate') {
            bytes = bytes.slice(0, op.size ?? 0)
            cursor = Math.min(cursor, bytes.length)
          }
        }
      },
      async close() {
        closed = true
        dir.set(name, { bytes })
      },
      async abort() {
        closed = true
      },
    }
  }

  function dirHandle(dir: Map<string, Dir | { bytes: Uint8Array }>): FileSystemDirectoryHandle {
    const handle = {
      kind: 'directory',
      name: '',
      async getFileHandle(name: string, options?: { create?: boolean }) {
        const found = dir.get(name)
        if (!found) {
          if (!options?.create) throw domError('NotFoundError')
          dir.set(name, { bytes: new Uint8Array() })
          return fileHandle(dir, name)
        }
        if (!('bytes' in found)) throw domError('TypeMismatchError')
        return fileHandle(dir, name)
      },
      async getDirectoryHandle(name: string, options?: { create?: boolean }) {
        const found = dir.get(name)
        if (!found) {
          if (!options?.create) throw domError('NotFoundError')
          const entry: Dir = { dir: new Map() }
          dir.set(name, entry)
          return dirHandle(entry.dir)
        }
        if (!('dir' in found)) throw domError('TypeMismatchError')
        return dirHandle(found.dir)
      },
      async removeEntry(name: string, options?: { recursive?: boolean }) {
        const found = dir.get(name)
        if (!found) throw domError('NotFoundError')
        if ('dir' in found && found.dir.size > 0 && !options?.recursive) {
          throw domError('InvalidModificationError')
        }
        dir.delete(name)
      },
      async *values(): AsyncGenerator<FileSystemHandle> {
        for (const [name, found] of dir) {
          yield ('dir' in found ? dirHandle(found.dir) : fileHandle(dir, name)) as FileSystemHandle
        }
      },
      async *entries(): AsyncGenerator<[string, FileSystemHandle]> {
        for (const [name, found] of dir) {
          yield [
            name,
            ('dir' in found ? dirHandle(found.dir) : fileHandle(dir, name)) as FileSystemHandle,
          ]
        }
      },
      async *keys(): AsyncGenerator<string> {
        for (const [name] of dir) yield name
      },
      isSameEntry: () => false,
    }
    return handle as unknown as FileSystemDirectoryHandle
  }

  function fileHandle(
    dir: Map<string, Dir | { bytes: Uint8Array }>,
    name: string
  ): FileSystemFileHandle {
    return {
      kind: 'file',
      name,
      async getFile() {
        const found = dir.get(name)
        if (!found || !('bytes' in found)) throw domError('NotFoundError')
        return new File([found.bytes.slice().buffer as ArrayBuffer], name)
      },
      async createWritable(options?: { keepExistingData?: boolean }) {
        return writerFor(dir, name, options?.keepExistingData ?? false)
      },
      isSameEntry: () => false,
    } as unknown as FileSystemFileHandle
  }

  return {
    rootDir,
    storage: { getDirectory: async () => dirHandle(rootDir.dir) },
  }
}

function stubWeb(opfs = fakeOpfs()) {
  vi.stubGlobal('window', {})
  vi.stubGlobal('navigator', { storage: opfs.storage })
  return opfs
}

describe('web flat FileSystem over opfs', () => {
  it('round-trips the file lifecycle', async () => {
    stubWeb()
    const dir = 'opfs://one/cache/lifecycle/'
    await FileSystem.makeDirectory(`${dir}nested/`)
    await FileSystem.writeFile(`${dir}note.txt`, 'héllo 👋')
    const info = await FileSystem.getInfo(`${dir}note.txt`)
    expect(info).toMatchObject({ exists: true, isDirectory: false, size: 11 })
    expect(info.modifiedAt).toBeGreaterThan(0)
    await FileSystem.writeFile(`${dir}binary.dat`, 'AAECAw==', 'base64')
    await FileSystem.copy(`${dir}note.txt`, `${dir}copy.txt`)
    await FileSystem.move(`${dir}copy.txt`, `${dir}moved.txt`)
    const entries = await FileSystem.readDirectory(dir)
    expect(entries.map((entry) => entry.name).sort()).toEqual([
      'binary.dat',
      'moved.txt',
      'nested',
      'note.txt',
    ])
    await FileSystem.delete(dir)
    expect((await FileSystem.getInfo(dir)).exists).toBe(false)
  })

  it('rejects bad base64, missing parents and protected roots', async () => {
    stubWeb()
    await expect(FileSystem.writeFile('opfs://one/cache/bad.dat', '!?', 'base64')).rejects.toThrow(
      'FileSystem: invalid base64 contents'
    )
    await expect(FileSystem.writeFile('opfs://one/cache/nope/n.txt', 'x')).rejects.toThrow(
      expect.objectContaining({ name: 'NotFoundError' })
    )
    await expect(FileSystem.delete('opfs://one/cache/')).rejects.toThrow(
      'FileSystem: app root directories are protected'
    )
    await expect(FileSystem.getInfo('file:///cache/note.txt')).rejects.toThrow(
      'FileSystem: expected an opfs://one/ URI'
    )
  })

  it('stays inert on the server', async () => {
    expect(FileSystem.getDirectories()).toEqual({
      documents: '',
      cache: '',
      applicationSupport: '',
      temporary: '',
    })
    expect(await FileSystem.getInfo('opfs://one/cache/note.txt')).toEqual({
      uri: 'opfs://one/cache/note.txt',
      exists: false,
      isDirectory: false,
    })
    expect(await FileSystem.readDirectory('opfs://one/cache/')).toEqual([])
    await expect(FileSystem.writeFile('opfs://one/cache/n.txt', 'x')).resolves.toBeUndefined()
  })
})

describe('web File', () => {
  it('reads, writes and appends through opfs', async () => {
    stubWeb()
    const { File } = await import('../src/platform/file-system/classes')
    const file = new File('opfs://one/cache/note.txt')
    expect(file.uri).toBe('opfs://one/cache/note.txt')
    expect(file.name).toBe('note.txt')
    expect(file.parentDirectory.uri).toBe('opfs://one/cache')
    await file.write('héllo')
    expect(await file.text()).toBe('héllo')
    expect(Array.from(await file.bytes())).toEqual([104, 195, 169, 108, 108, 111])
    expect(await file.base64()).toBe(Buffer.from('héllo', 'utf8').toString('base64'))
    expect(await file.json.call({ text: async () => '{"b":2}' } as never)).toEqual({ b: 2 })
    await file.write(' 👋', { append: true })
    expect(await file.text()).toBe('héllo 👋')
    await file.write(new Uint8Array([1, 2, 3]))
    expect(Array.from(await file.bytes())).toEqual([1, 2, 3])
    await file.write('QUI=', { encoding: 'base64' })
    expect(await file.text()).toBe('AB')
    expect(() => file.write('!?', { encoding: 'base64' })).toThrow(
      'FileSystem: invalid base64 contents'
    )
  })

  it('copies and moves with uri updates and overwrite', async () => {
    stubWeb()
    const { File, Directory } = await import('../src/platform/file-system/classes')
    const dir = 'opfs://one/cache/relocate/'
    await FileSystem.makeDirectory(dir)
    const target = new Directory(`${dir}target/`)
    await FileSystem.makeDirectory(target.uri)
    const file = new File(`${dir}a.txt`)
    await file.write('a')
    await file.copy(target)
    expect(await new File(`${dir}target/a.txt`).text()).toBe('a')
    await file.copy(new File(`${dir}b.txt`))
    const other = new File(`${dir}c.txt`)
    await other.write('c')
    await expect(other.copy(new File(`${dir}a.txt`))).rejects.toThrow(
      'FileSystem: destination already exists'
    )
    await other.copy(new File(`${dir}a.txt`), { overwrite: true })
    expect(await new File(`${dir}a.txt`).text()).toBe('c')
    await other.move(target)
    expect(other.uri).toBe(`${dir}target/c.txt`)
    await other.move(target)
    expect(other.uri).toBe(`${dir}target/c.txt`)
    await expect(new Directory(dir).copy(target, { overwrite: true })).rejects.toThrow(
      'FileSystem: overlapping paths'
    )
  })

  it('digests sha algorithms and refuses md5', async () => {
    stubWeb()
    const { File } = await import('../src/platform/file-system/classes')
    const file = new File('opfs://one/cache/digest.txt')
    await file.write('abc')
    expect(await file.digest('SHA-256')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    )
    await expect(file.digest('MD5')).rejects.toThrow('File.digest: MD5 is not available on web')
    expect(() => (file as { digest: (a: string) => unknown }).digest('nope')).toThrow(
      'File.digest: expected a digest algorithm'
    )
  })

  it('throws for every synchronous member', async () => {
    stubWeb()
    const { File, Directory, Paths } = await import('../src/platform/file-system/classes')
    const file = new File('opfs://one/cache/a.txt')
    const dir = new Directory('opfs://one/cache/')
    expect(() => file.exists).toThrow('File.exists is not available on web')
    expect(() => file.size).toThrow('File.size is not available on web')
    expect(() => file.type).toThrow('File.type is not available on web')
    expect(() => file.textSync()).toThrow('File.textSync is not available on web')
    expect(() => file.bytesSync()).toThrow('File.bytesSync is not available on web')
    expect(() => file.base64Sync()).toThrow('File.base64Sync is not available on web')
    expect(() => file.info()).toThrow('File.info is not available on web')
    expect(() => file.writeSync('x')).toThrow('File.writeSync is not available on web')
    expect(() => file.create()).toThrow('File.create is not available on web')
    expect(() => file.delete()).toThrow('File.delete is not available on web')
    expect(() => file.copySync(dir)).toThrow('File.copySync is not available on web')
    expect(() => file.moveSync(dir)).toThrow('File.moveSync is not available on web')
    expect(() => file.rename('b.txt')).toThrow('File.rename is not available on web')
    expect(() => dir.exists).toThrow('Directory.exists is not available on web')
    expect(() => dir.list()).toThrow('Directory.list is not available on web')
    expect(() => dir.info()).toThrow('Directory.info is not available on web')
    expect(() => dir.create()).toThrow('Directory.create is not available on web')
    expect(() => dir.createFile('x', null)).toThrow('Directory.createFile is not available on web')
    expect(() => Paths.bundle).toThrow('Paths.bundle is not available on web')
    expect(() => Paths.totalDiskSpace).toThrow('Paths.totalDiskSpace is not available on web')
    expect(() => Paths.info('opfs://one/cache/')).toThrow('Paths.info is not available on web')
    expect(Paths.cache.uri).toBe('opfs://one/cache/')
    expect(Paths.document.uri).toBe('opfs://one/documents/')
  })

  it('stays inert on the server', async () => {
    const { File, Directory } = await import('../src/platform/file-system/classes')
    const file = new File('opfs://one/cache/a.txt')
    expect(await file.text()).toBe('')
    expect(Array.from(await file.bytes())).toEqual([])
    expect(await file.base64()).toBe('')
    expect((await file.arrayBuffer()).byteLength).toBe(0)
    await expect(file.write('x')).resolves.toBeUndefined()
    await expect(file.copy(new Directory('opfs://one/cache/'))).resolves.toBeUndefined()
    await expect(file.move(new Directory('opfs://one/cache/'))).resolves.toBeUndefined()
    await expect(file.digest('SHA-256')).rejects.toThrow(
      'File.digest is not available on the server'
    )
  })
})

describe('web FileHandle', () => {
  it('reads, writes, seeks, truncates and appends', async () => {
    stubWeb()
    const { File, FileMode } = await import('../src/platform/file-system/classes')
    const file = new File('opfs://one/cache/handle.bin')
    await file.write(new Uint8Array([10, 20, 30, 40]))
    const reader = file.open(FileMode.ReadOnly)
    expect(reader.offset).toBe(0)
    expect(Array.from(await reader.readBytes(2))).toEqual([10, 20])
    expect(reader.offset).toBe(2)
    reader.offset = 3
    expect(Array.from(await reader.readBytes(5))).toEqual([40])
    reader.close()
    expect(reader.offset).toBeNull()
    const writer = file.open(FileMode.WriteOnly)
    await writer.writeBytes(new Uint8Array([7, 8]))
    expect(Array.from(await file.bytes())).toEqual([7, 8, 30, 40])
    const appender = file.open(FileMode.Append)
    await appender.writeBytes(new Uint8Array([9]))
    expect(Array.from(await file.bytes())).toEqual([7, 8, 30, 40, 9])
    expect(appender.offset).toBe(5)
    const truncator = file.open(FileMode.Truncate)
    await truncator.writeBytes(new Uint8Array([1]))
    expect(Array.from(await file.bytes())).toEqual([1])
    truncator.close()
  })

  it('enforces modes and closed handles like native', async () => {
    stubWeb()
    const { File, FileMode } = await import('../src/platform/file-system/classes')
    const file = new File('opfs://one/cache/mode.bin')
    await file.write(new Uint8Array([1]))
    const reader = file.open(FileMode.ReadOnly)
    expect(() => reader.writeBytes(new Uint8Array([2]))).toThrow(
      'FileHandle.writeBytes: the handle is not writable'
    )
    const writer = file.open(FileMode.WriteOnly)
    expect(() => writer.readBytes(1)).toThrow('FileHandle.readBytes: the handle is not readable')
    expect(() => writer.size).toThrow('FileHandle.size is not available on web')
    expect(() => writer.readBytesSync(1)).toThrow(
      'FileHandle.readBytesSync is not available on web'
    )
    writer.close()
    expect(() => writer.writeBytes(new Uint8Array([2]))).toThrow(
      'FileHandle.writeBytes: the handle is closed'
    )
    expect(() => file.open('xx' as never)).toThrow('File.open: expected a FileMode')
  })

  it('streams a web file end to end', async () => {
    stubWeb()
    const { File } = await import('../src/platform/file-system/classes')
    const file = new File('opfs://one/cache/webstream.bin')
    const writer = file.writableStream().getWriter()
    await writer.write(new Uint8Array([5, 6]))
    await writer.write(new Uint8Array([7]))
    await writer.close()
    const reader = file.readableStream().getReader()
    const chunks: number[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(...value)
    }
    expect(chunks).toEqual([5, 6, 7])
  })
})
