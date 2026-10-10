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
const bytecode = new URL(url).searchParams.get('bytecode') === 'hermes'
if (bytecode && Buffer.from(bytes).subarray(0, 8).toString('hex') !== 'c61fbc03c103191f')
  throw new Error('Native application response is not Hermes bytecode')
console.log(`RAN compiled native ${bytecode ? 'Hermes bytecode' : 'JavaScript'} bundle ${url}: ${bytes.byteLength} bytes`)
