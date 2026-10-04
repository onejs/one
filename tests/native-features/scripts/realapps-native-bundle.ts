export {}
const url = process.argv[2]
if (!url) throw new Error('Expected native bundle URL')
// compilation belongs to the build step, which owns admission and its deadline.
const response = await fetch(url)
if (!response.ok)
  throw new Error(`${url}: HTTP ${response.status}: ${await response.text()}`)
if (!response.headers.get('content-type')?.includes('javascript'))
  throw new Error(`Expected JavaScript, got ${response.headers.get('content-type')}`)
const bytes = await response.arrayBuffer()
if (!bytes.byteLength) throw new Error('Native application bundle is empty')
console.log(`RAN compiled native bundle ${url}: ${bytes.byteLength} bytes`)
