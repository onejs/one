// the props string of a typed native view host, as keyed changes. the first
// document of a host instance carries every prop. a later one carries the props
// that changed, and for a long array prop only the elements whose identity
// changed. the host holds the decoded props and the `$seq` of the last
// document it applied; a change whose `$base` is not that seq cannot be applied,
// so the host answers `$resync` and the next render sends everything again.
//
//   full:   {"$seq":N, ...props}
//   change: {"$seq":N, "$base":M, ...changed props, "$lists":{"rows":{"length":L,"set":[[i,element],...]}}}
//
// a changed prop replaces the held value whole, an absent prop keeps it, and a
// prop removed from the element is sent as null. `$lists` resizes the held array
// to `length` and replaces the `set` indices; an index past the held length
// appends and must arrive in order.
import { useLayoutEffect, useRef, useState } from 'react'
import {
  encodeNativeSourceListItem,
  encodeNativeSourceProp,
  stringifyNativeSourceProps,
  type NativeSourceViewWires,
  type NativeSourceWire,
} from './wire.native'

// shorter arrays are cheaper to send whole than to diff
const MIN_LIST = 32

export const RESYNC_EVENT = '$resync'

interface Sent {
  seq: number
  text: string
  // the arrays last sent, by identity, to diff the next one against
  lists: Record<string, unknown[]>
  // the json of every other prop, to send only what changed
  texts: Record<string, string>
}

// the element wire of an array prop (undefined when elements are plain json),
// or null when the prop is not an array on the wire
function listElement(wire: NativeSourceWire | undefined): NativeSourceWire | undefined | null {
  if (wire === undefined) return undefined
  if (wire.kind === 'array') return wire.element
  if (wire.kind === 'nullable') return listElement(wire.inner)
  return null
}

export function nextDocument(
  props: Record<string, unknown>,
  wires: NativeSourceViewWires | undefined,
  prev: Sent | null,
  full: boolean
): Sent | null {
  const whole = full || prev === null
  const seq = (prev?.seq ?? 0) + 1
  const lists: Record<string, unknown[]> = {}
  const texts: Record<string, string> = {}
  const entries: string[] = []
  const patches: Record<string, { length: number; set: [number, unknown][] }> = {}
  for (const name of Object.keys(props)) {
    const value = props[name]
    if (value === undefined) continue
    const element = listElement(wires?.props[name])
    if (Array.isArray(value) && value.length >= MIN_LIST && element !== null) {
      lists[name] = value
      const before = prev?.lists[name]
      if (!whole && before) {
        const indices: number[] = []
        for (let i = 0; i < value.length; i++) {
          if (i >= before.length || before[i] !== value[i]) indices.push(i)
        }
        if (indices.length === 0 && before.length === value.length) continue
        if (indices.length * 2 < value.length) {
          patches[name] = {
            length: value.length,
            set: indices.map((i) => [
              i,
              element === undefined ? value[i] : encodeNativeSourceListItem(name, i, value[i], element, wires!.structs),
            ]),
          }
          continue
        }
      }
      entries.push(`${JSON.stringify(name)}:${JSON.stringify(encodeNativeSourceProp(name, value, wires))}`)
      continue
    }
    const text = typeof value === 'function' ? 'true' : JSON.stringify(encodeNativeSourceProp(name, value, wires))
    texts[name] = text
    if (!whole && prev.texts[name] === text) continue
    entries.push(`${JSON.stringify(name)}:${text}`)
  }
  if (!whole) {
    for (const name of [...Object.keys(prev.texts), ...Object.keys(prev.lists)]) {
      if (!(name in texts) && !(name in lists)) entries.push(`${JSON.stringify(name)}:null`)
    }
    if (entries.length === 0 && Object.keys(patches).length === 0) return null
    if (Object.keys(patches).length > 0) entries.push(`"$lists":${JSON.stringify(patches)}`)
  }
  const head = whole ? `"$seq":${seq}` : `"$seq":${seq},"$base":${prev.seq}`
  return { seq, text: `{${[head, ...entries].join(',')}}`, lists, texts }
}

export function useNativeSourceProps(
  props: Record<string, unknown>,
  wires: NativeSourceViewWires | undefined,
  keyed: boolean
): { text: string; resync: () => void } {
  const sent = useRef<Sent | null>(null)
  const needFull = useRef(false)
  const [, rerender] = useState(0)
  const next = keyed ? nextDocument(props, wires, sent.current, needFull.current) : null
  // render stays pure: the document counts as sent once this render commits
  useLayoutEffect(() => {
    if (next) {
      sent.current = next
      needFull.current = false
    }
  })
  const resync = () => {
    needFull.current = true
    rerender((n) => n + 1)
  }
  if (!keyed) return { text: stringifyNativeSourceProps(props, wires), resync }
  return { text: (next ?? sent.current!).text, resync }
}
