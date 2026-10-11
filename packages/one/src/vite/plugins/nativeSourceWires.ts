// shared by the swift and kotlin source renderers: methods without a wire
// keep the historical one-liner byte-identical, while wired methods encode
// arguments and revive results around the same native call.
export interface WireMethodParam {
  wire?: unknown
}

export interface WireMethod {
  name: string
  parameters: (WireMethodParam & { name: string })[]
  resultWire?: unknown
}

export interface WireViewProp {
  name: string
  wire?: unknown
  callback: { wire?: unknown }[] | null
}

export interface WireView {
  props: WireViewProp[]
}

export function methodWired(method: {
  parameters: { wire?: unknown }[]
  resultWire?: unknown
}): boolean {
  return method.parameters.some((param) => param.wire) || method.resultWire !== undefined
}

export function methodSubscribed(method: { subscription?: unknown }): boolean {
  return method.subscription !== undefined
}

export function renderMethodCall(
  target: string,
  method: {
    name: string
    parameters: { name: string; wire?: unknown }[]
    resultWire?: unknown
    subscription?: unknown
  },
  hash: string
): string {
  if (method.subscription) {
    const payload = method.subscription as { payload: { wire?: unknown }[] }
    const payloadWires = JSON.stringify(payload.payload.map((arg) => arg.wire ?? null))
    return `${method.name}: (listener) => subscribeNativeSourceEvent(${JSON.stringify(target)}, ${JSON.stringify(method.name)}, listener, ${JSON.stringify(hash)}, ${payloadWires}, nativeSourceStructs)`
  }
  if (!methodWired(method)) {
    return `${method.name}: (...args) => callNativeSource(${JSON.stringify(target)}, ${JSON.stringify(method.name)}, args, ${JSON.stringify(hash)})`
  }
  const paramWires = JSON.stringify(method.parameters.map((param) => param.wire ?? null))
  const resultWire = JSON.stringify(method.resultWire ?? null)
  return `${method.name}: (...args) => callNativeSource(${JSON.stringify(target)}, ${JSON.stringify(method.name)}, encodeNativeSourceArgs(args, ${paramWires}, nativeSourceStructs), ${JSON.stringify(hash)}).then((value) => decodeNativeSourceResult(value, ${resultWire}, nativeSourceStructs))`
}

// element wires for one imported view: prop wires encode props before the
// host stringifies them, callback wires revive callback arguments, and the
// structs table walks both. views without a wire render exactly as before.
export function renderViewWires(
  view: WireView,
  structs: unknown
): string {
  const props: Record<string, unknown> = {}
  const callbacks: Record<string, unknown> = {}
  for (const prop of view.props) {
    if (prop.wire) props[prop.name] = prop.wire
    if (prop.callback && prop.callback.some((arg) => arg.wire)) {
      callbacks[prop.name] = prop.callback.map((arg) => arg.wire ?? null)
    }
  }
  if (Object.keys(props).length === 0 && Object.keys(callbacks).length === 0) return ''
  return `, wires: ${JSON.stringify({ props, callbacks, structs })}`
}
