import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
// @ts-ignore react native ships no types for its dev server lookup
import getDevServer from 'react-native/Libraries/Core/Devtools/getDevServer'

// drives the global fetch against endpoints the dev server serves (see
// vite.config.ts) and prints one label per behavior. results travel as
// labels because RN Text testIDs vanish from the accessibility snapshot.
const base = () => `${getDevServer().url}__one-native-fetch/`

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result)
      else reject(new Error('FileReader returned no ArrayBuffer'))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : String(error)
}

async function runAll(report: (name: string, value: string) => void) {
  // chunks land as the server writes them, 600ms apart; a buffered fetch
  // sees the first chunk only when the whole body is done
  {
    const started = Date.now()
    const response = await fetch(`${base()}stream`)
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    const arrivals: number[] = []
    let text = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      arrivals.push(Date.now() - started)
      text += decoder.decode(value, { stream: true })
    }
    const ended = Date.now() - started
    const early = arrivals[0] !== undefined && ended - arrivals[0] >= 900
    const counts = text
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line).n)
    report('Stream', `${counts.join('|')} early=${early}`)
  }
  {
    const response = await fetch(`${base()}echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-one-test': 'yes' },
      body: JSON.stringify({ a: 1 }),
    })
    const echo = await response.json()
    report(
      'Echo',
      `${response.status} ${response.headers.get('x-one-echo')} ${echo.method} ${echo.contentType} ${echo.custom} a=${JSON.parse(echo.text).a}`
    )
  }
  {
    const echo = await (
      await fetch(`${base()}echo`, { method: 'PUT', body: new Uint8Array([0, 1, 2, 255]) })
    ).json()
    report('Bytes', `${echo.method} ${echo.hex}`)
  }
  {
    const blob = await (await fetch(`${base()}bytes`)).blob()
    report('Blob', `${blob.size} ${blob.type} ${hex(await readBlob(blob))}`)
    const form = new FormData()
    form.append('field', 'value')
    form.append('file', blob)
    // each platform writes the layout react native wrote there: okhttp's
    // multipart on android adds a content-length to every part
    const length = (size: number) => (Platform.OS === 'android' ? `Content-Length: ${size}\r\n` : '')
    const multipart = (echo: { contentType: string; text: string; length: string | null }) => {
      const boundary = /boundary=(\S+)/.exec(echo.contentType)?.[1]
      const expected =
        `--${boundary}\r\nContent-Disposition: form-data; name="field"\r\n${length(5)}\r\nvalue\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="blob"\r\n` +
        `Content-Type: application/octet-stream\r\n${length(4)}\r\n\u0000\u0001\u0002ÿ\r\n--${boundary}--\r\n`
      return `${echo.contentType.split(';')[0]} ${echo.text === expected} ${echo.length === String(expected.length)}`
    }
    report('Form', multipart(await (await fetch(`${base()}echo`, { method: 'POST', body: form })).json()))
    // a Request carries its FormData body through to the same encoding
    const request = new Request(`${base()}echo`, { method: 'POST', body: form })
    report('RequestForm', multipart(await (await fetch(request)).json()))
    const echo = await (
      await fetch(new Request(`${base()}echo`, { method: 'PUT', body: blob }))
    ).json()
    report('RequestBlob', `${echo.contentType} ${echo.hex} ${echo.length}`)
  }
  {
    const response = await fetch(`${base()}redirect`)
    report('Redirect', `${response.status} ${response.redirected} ${response.url.endsWith('/echo')}`)
  }
  {
    await fetch(`${base()}set-cookie`)
    const sent = (await (await fetch(`${base()}echo`)).json()).cookie
    const omitted = (await (await fetch(`${base()}echo`, { credentials: 'omit' })).json()).cookie
    report('Cookie', `${sent} ${omitted}`)
  }
  {
    const response = await fetch(`${base()}no-content`)
    report('NoContent', `${response.status} ${response.body}`)
  }
  {
    const response = await fetch(`${base()}echo`)
    const copy = response.clone()
    const [a, b] = await Promise.all([response.text(), copy.text()])
    report('Clone', `${a === b && a.length > 0} ${response.bodyUsed}`)
    // a clone owns its headers, and every response is a Response to libraries
    copy.headers.append('x-one-clone', '1')
    report('Identity', `${response instanceof Response} ${response.headers.has('x-one-clone')}`)
  }
  {
    // abort mid-body errors the reader with the abort reason
    const controller = new AbortController()
    const response = await fetch(`${base()}hang`, { signal: controller.signal })
    const reader = response.body!.getReader()
    const first = new TextDecoder().decode((await reader.read()).value)
    controller.abort()
    const outcome = await reader.read().then(
      () => 'resolved',
      (error: unknown) => errorName(error)
    )
    report('Abort', `${first} ${outcome}`)
  }
  {
    const controller = new AbortController()
    controller.abort()
    const outcome = await fetch(`${base()}echo`, { signal: controller.signal }).then(
      () => 'resolved',
      (error: unknown) => errorName(error)
    )
    report('AbortBefore', outcome)
  }
  {
    // spelled out: the android harness reads a literal TypeError on screen
    // as a RedBox
    const outcome = await fetch('http://127.0.0.1:9/').then(
      () => 'resolved',
      (error: unknown) => (error instanceof TypeError ? 'type error' : errorName(error))
    )
    report('Refused', outcome)
  }
}

export default function OneNativeFetch() {
  const [results, setResults] = useState<[string, string][]>([])
  const [status, setStatus] = useState('idle')

  return (
    <View style={styles.screen}>
      <Text>{`Status: ${status}`}</Text>
      {results.map(([name, value]) => (
        <Text key={name}>{`${name}: ${value}`}</Text>
      ))}
      <Pressable
        testID="one-native-fetch-run"
        style={styles.chip}
        onPress={() => {
          setResults([])
          setStatus('running')
          runAll((name, value) => setResults((current) => [...current, [name, value]])).then(
            () => setStatus('done'),
            (error: unknown) => setStatus(`failed ${errorName(error)} ${String(error)}`)
          )
        }}
      >
        <Text>Run fetch checks</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 6 },
  chip: { padding: 10, borderRadius: 8, backgroundColor: '#e5e7eb', alignSelf: 'flex-start' },
})
