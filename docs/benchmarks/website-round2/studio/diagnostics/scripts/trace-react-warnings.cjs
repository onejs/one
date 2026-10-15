const { appendFileSync } = require('node:fs')
const seen = new Set()
for (const method of ['warn', 'error']) {
  const original = console[method]
  console[method] = function (...args) {
    const text = args.map(String).join(' ')
    const match = /Invalid hook call|Using global config fallback/.exec(text)?.[0]
    if (match && !seen.has(match)) {
      seen.add(match)
      appendFileSync(process.env.ONE_ROUND2_WARNING_STACK, `${match}\n${new Error('warning origin').stack}\n`)
    }
    return original.apply(this, args)
  }
}
