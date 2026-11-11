const FRAME_V8 = /^\s*at (.*?)(?: \((.*)\))?$/
const FRAME_JSC = /^(.*?)@(.*)$/
const FILE_POSITION = /([^/\s?#()]+?)(?:[?#][^\s()]*?)?:(\d+):(\d+)\)?$/

// a frame's location is only worth showing when it names a real file.
// eval, blob and anonymous locations point at bundler wrappers, and full
// urls with query strings bury the function names on a narrow screen.
function shortLocation(location: string) {
  if (/^(eval at|blob:)|<anonymous>|native code/.test(location)) return ''
  const match = location.match(FILE_POSITION)
  return match ? `${match[1]}:${match[2]}:${match[3]}` : ''
}

export function cleanErrorStack(stack: string): string[] {
  const frames: string[] = []
  for (const line of stack.split('\n')) {
    const v8 = line.match(FRAME_V8)
    const jsc = v8 ? null : line.match(FRAME_JSC)
    const name = (v8?.[1] ?? jsc?.[1] ?? '').trim()
    if (!v8 && !jsc) continue
    const location = shortLocation((v8?.[2] ?? jsc?.[2] ?? '').trim())
    // v8 prints a bare `at https://host/file.js:1:2` frame for anonymous code
    const label = !v8?.[2] && v8 && /:\d+:\d+$/.test(name) ? shortLocation(name) : name
    if (!label && !location) continue
    frames.push(location ? `${label || '<anonymous>'}  ${location}` : label)
  }
  return frames
}
