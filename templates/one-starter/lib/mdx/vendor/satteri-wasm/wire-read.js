/**
 * Little-endian primitives for reading the walk/snapshot wire buffers. Shared by
 * the hand-written decoders and the generated layout decoder so both interpret
 * the bytes identically.
 */
// `ignoreBOM` keeps a value-initial U+FEFF: each string is decoded from its
// own byte range, so the default BOM strip would eat it as content.
const textDecoder = new TextDecoder('utf-8', { ignoreBOM: true })
/** Read a u16 (LE) at `off`. */
export function ru16(view, off) {
  return view.getUint16(off, true)
}
/** Read a u32 (LE) at `off`. */
export function ru32(view, off) {
  return view.getUint32(off, true)
}
/** Read a UTF-8 string of `len` bytes at `off`. Very short ASCII runs decode
 *  with a charCode loop — TextDecoder's per-call overhead dominates there. The
 *  threshold is lower than the encode-side `INLINE_STR_MAX`: decoding builds a
 *  JS string by concatenation, which costs more per char than storing bytes.
 *  Measured crossover ~8-12 bytes (Node 24: 8B 30 vs 57 ns, 16B 64 vs 57). */
export function rstr(buf, off, len) {
  if (len === 0) return ''
  if (len <= 8) {
    let ascii = true
    for (let i = 0; i < len; i++) {
      if (buf[off + i] > 127) {
        ascii = false
        break
      }
    }
    if (ascii) {
      let s = ''
      for (let i = 0; i < len; i++) s += String.fromCharCode(buf[off + i])
      return s
    }
  }
  return textDecoder.decode(buf.subarray(off, off + len))
}
/**
 * Decode the 24-byte position block ([startOffset, endOffset, startLine,
 * startColumn, endLine, endColumn], u32 LE each) shared by the walk prefixes
 * and the snapshot node structs. A zero start line is the sentinel for
 * synthesized nodes with no source range (e.g. GFM autolink-literal nodes, or a
 * plugin-built replacement spliced by the rebuild): unist lines are 1-based, so
 * line 0 always means "no source position" — even when the rebuild has rebased
 * the (otherwise zero) offset by the spliced subtree's source base. Surfaced as
 * `undefined` so a node reads the same however it's reached.
 */
export function readPosition(view, off) {
  const startLine = ru32(view, off + 8)
  if (startLine === 0) return undefined
  const startOffset = ru32(view, off)
  return {
    start: { offset: startOffset, line: startLine, column: ru32(view, off + 12) },
    end: {
      offset: ru32(view, off + 4),
      line: ru32(view, off + 16),
      column: ru32(view, off + 20),
    },
  }
}
