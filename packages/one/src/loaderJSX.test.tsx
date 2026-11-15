import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { reviveLoaderData, reviveLoaderJSX, registerLoaderClient, ServerJSX } from './loaderJSX'
import { transformTreeShakeClient } from './vite/plugins/clientTreeShakePlugin'
import { transformUseClient } from './vite/plugins/loaderJSXPlugin'
import { ClientFallback, JSXSlot, renderJSX } from './server/renderJSX'

const wire = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

function Counter(props: { start: number; children?: React.ReactNode }) {
  return <button>{props.start}{props.children}</button>
}
registerLoaderClient('app/Counter.tsx#Counter', Counter)

async function Post({ id }: { id: number }) {
  await new Promise((r) => setTimeout(r, 5))
  return <article>post {id}</article>
}

describe('renderJSX', () => {
  it('walks async server components in parallel and emits compact nodes', async () => {
    const started = Date.now()
    const envelope = await renderJSX(
      <main>
        <Post id={1} />
        <Post id={2} />
        <Counter start={3}>
          <b>child</b>
        </Counter>
      </main>
    )
    expect(Date.now() - started).toBeLessThan(500)
    expect(envelope.__oneJSX).toEqual([
      'h',
      'main',
      {},
      ['h', 'article', {}, 'post ', 1],
      ['h', 'article', {}, 'post ', 2],
      ['c', 'app/Counter.tsx#Counter', { start: 3, children: { __oneJSX: ['h', 'b', {}, 'child'] } }],
    ])
  })

  it('rejects stateful hooks outside client components', async () => {
    function Bad() {
      React.useState(0)
      return <i />
    }
    await expect(renderJSX(<Bad />)).rejects.toThrow(/<Bad> called useState.*use client/)
  })

  it('rejects stateful hooks called after await in parallel async server components while allowing useMemo', async () => {
    async function AsyncBad() {
      await new Promise((r) => setTimeout(r, 5))
      React.useState(0)
      return <i />
    }
    async function AsyncEffect() {
      await new Promise((r) => setTimeout(r, 5))
      React.useEffect(() => {}, [])
      return <i />
    }
    async function AsyncMemo() {
      await new Promise((r) => setTimeout(r, 5))
      const val = React.useMemo(() => 42, [])
      return <p>{val}</p>
    }
    await expect(
      renderJSX(
        <main>
          <AsyncMemo />
          <AsyncBad />
        </main>
      )
    ).rejects.toThrow(/<AsyncBad> called useState.*use client/)
    await expect(renderJSX(<AsyncEffect />)).rejects.toThrow(
      /<AsyncEffect> called useEffect.*use client/
    )
    const ok = await renderJSX(<AsyncMemo />)
    expect(ok.__oneJSX).toEqual(['h', 'p', {}, 42])
  })

  it('rejects non-serializable props crossing to a client component', async () => {
    await expect(renderJSX(<Counter start={(() => 1) as any} />)).rejects.toThrow(/a function/)
  })

  it('(a, b) ssr html equals frame-1 html and the ssg payload is static json', async () => {
    const envelope = await renderJSX(
      <section>
        <Post id={7} />
        <Counter start={1} />
      </section>
    )
    const staticLoaderOutput = JSON.stringify({ ui: envelope })
    const ssr = renderToString(<>{reviveLoaderData(JSON.parse(staticLoaderOutput)).ui}</>)
    const frame1 = renderToString(<ServerJSX value={wire(envelope)} />)
    expect(ssr).toBe(frame1)
    expect(ssr).toContain('post <!-- -->7')
    expect(ssr).toContain('<button>1</button>')
  })

  it('memoizes revival by envelope reference', async () => {
    const envelope = wire(await renderJSX(<Counter start={1} />))
    expect(reviveLoaderJSX(envelope)).toBe(reviveLoaderJSX(envelope))
    const data = { ui: envelope }
    expect(reviveLoaderData(data)).toBe(reviveLoaderData(data))
    const plain = { a: 1 }
    expect(reviveLoaderData(plain)).toBe(plain)
  })

  it('(c) renders native-style dynamic views from the universal registry and fills slots', async () => {
    const View = (props: any) => React.createElement('rn-view', props)
    registerLoaderClient('tamagui#View', View)
    const envelope = wire(
      await renderJSX(
        <View padding={4}>
          <JSXSlot name="footer" tone="dim">
            <i>fallback</i>
          </JSXSlot>
        </View>
      )
    )
    expect(renderToString(<ServerJSX value={envelope} />)).toContain('<i>fallback</i>')
    const html = renderToString(
      <ServerJSX value={envelope} slots={{ footer: (p: any) => <u>{p.tone}</u> }} />
    )
    expect(html).toContain('<u>dim</u>')
    expect(html).toContain('padding="4"')
  })

  it('(d) an unknown client id renders its ClientFallback instead of crashing', async () => {
    function Newer() {
      return <div />
    }
    ;(Newer as any).__oneClientId = 'app/Newer.tsx#Newer'
    const envelope = wire(
      await renderJSX(
        <ClientFallback fallback={<p>update the app</p>}>
          <Newer />
        </ClientFallback>
      )
    )
    expect(envelope.__oneJSX).toEqual([
      'c',
      'app/Newer.tsx#Newer',
      {},
      ['h', 'p', {}, 'update the app'],
    ])
    expect(renderToString(<ServerJSX value={envelope} />)).toBe('<span style="display:contents"><p>update the app</p></span>')
    try {
      ;(globalThis as any).document = {}
      ;(globalThis as any).__vxrnRoot = {}
      expect(renderToString(<ServerJSX value={wire(envelope)} />)).toBe(
        '<span style="display:contents"></span>'
      )
    } finally {
      delete (globalThis as any).document
      delete (globalThis as any).__vxrnRoot
    }
  })
})

describe('loaderJSX plugin transforms', () => {
  it('tags use client exports with a stable id', () => {
    const out = transformUseClient(
      `'use client'\nexport function Chart() { return null }\nexport const hook = 1\nexport default function Panel() { return null }`,
      '/p/app/ui.tsx',
      '/p'
    )
    expect(out?.code).toContain('Chart.__oneClientId = "app/ui.tsx#Chart"')
    expect(out?.code).toContain('Panel.__oneClientId = "app/ui.tsx#default"')
    expect(out?.code).not.toContain('hook.__oneClientId')
    expect(transformUseClient(`export function A() {}`, '/p/a.tsx', '/p')).toBeUndefined()
  })

  it('ships no server walker in the client route bundle', async () => {
    const route = `import { renderJSX } from 'one'
import { db } from './db'
export async function loader() { return { ui: await renderJSX(<p>{db.x}</p>) } }
export default function Page() { return null }`
    const out = await transformTreeShakeClient(route, '/p/app/index.tsx', '/p', 'app')
    expect(out?.code).not.toContain('renderJSX')
    expect(out?.code).not.toContain('./db')
  })
})
