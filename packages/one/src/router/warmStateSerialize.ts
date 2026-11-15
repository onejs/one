import type { BackgroundExecutor } from '../background/backgroundContract'
import { createLatestComputation } from '../background/createLatestComputation'
import { createWorkerExecutor } from '../background/web'
import {
  serializeWarmInputSync,
  type WarmStateSerializeInput,
  type WarmStateSerializeOutput,
} from './warmStateShared'

// self-contained worker source so blob workers need no bundler asset entry.
const WARM_SERIALIZE_WORKER_SOURCE = `
var MAX_DEPTH = 32;
function sanitizeWarmValue(value, depth) {
  if (depth === void 0) depth = 0;
  if (depth > MAX_DEPTH) return undefined;
  if (value === null) return null;
  var kind = typeof value;
  if (kind === "string" || kind === "boolean") return value;
  if (kind === "number") return Number.isFinite(value) ? value : undefined;
  if (kind !== "object") return undefined;
  if (Array.isArray(value)) {
    var arr = [];
    for (var i = 0; i < value.length; i++) {
      var v = sanitizeWarmValue(value[i], depth + 1);
      arr.push(v === undefined ? null : v);
    }
    return arr;
  }
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : undefined;
  }
  var out = {};
  var keys = Object.keys(value);
  for (var j = 0; j < keys.length; j++) {
    var k = keys[j];
    var next = sanitizeWarmValue(value[k], depth + 1);
    if (next !== undefined) out[k] = next;
  }
  return out;
}
function toPartialNavigationState(state, depth) {
  if (depth === void 0) depth = 0;
  if (depth > MAX_DEPTH || !state || typeof state !== "object") return undefined;
  if (!Array.isArray(state.routes) || state.routes.length === 0) return undefined;
  var routes = [];
  for (var i = 0; i < state.routes.length; i++) {
    var r = state.routes[i];
    if (!r || typeof r !== "object" || typeof r.name !== "string" || !r.name) return undefined;
    var next = { name: r.name };
    if (r.params && typeof r.params === "object") {
      var p = sanitizeWarmValue(r.params, depth + 1);
      if (p && typeof p === "object" && !Array.isArray(p)) next.params = p;
    }
    if (typeof r.path === "string") next.path = r.path;
    if (r.state !== undefined) {
      var nested = toPartialNavigationState(r.state, depth + 1);
      if (nested) next.state = nested;
    }
    routes.push(next);
  }
  var partial = { routes: routes };
  if (typeof state.index === "number" && Number.isInteger(state.index) && state.index >= 0 && state.index < routes.length) {
    partial.index = state.index;
  }
  if (typeof state.type === "string" && state.type) partial.type = state.type;
  return partial;
}
self.onmessage = function (event) {
  var req = event.data;
  try {
    var input = req.input;
    var cleanSources = sanitizeWarmValue(input.sources);
    var envelope = {
      v: 1,
      schemaVersion: input.schemaVersion,
      updatedAt: input.updatedAt,
      sources: cleanSources && typeof cleanSources === "object" && !Array.isArray(cleanSources) ? cleanSources : {}
    };
    if (typeof input.pathname === "string" && input.pathname) envelope.pathname = input.pathname;
    var cleanState = toPartialNavigationState(input.state);
    if (cleanState) envelope.state = cleanState;
    self.postMessage({
      ok: true,
      result: { revision: req.revision, value: { json: JSON.stringify(envelope), updatedAt: input.updatedAt } }
    });
  } catch (err) {
    self.postMessage({ ok: false, revision: req.revision, error: err && err.message ? err.message : String(err) });
  }
};
`

function createMicrotaskExecutor(): BackgroundExecutor<
  WarmStateSerializeInput,
  WarmStateSerializeOutput
> {
  let disposed = false
  return {
    async execute(request, isCurrent) {
      await Promise.resolve()
      if (disposed || !isCurrent(request.revision)) return null
      return {
        revision: request.revision,
        value: serializeWarmInputSync(request.input),
      }
    },
    dispose() {
      disposed = true
    },
  }
}

function createWebWorkerExecutor(): BackgroundExecutor<
  WarmStateSerializeInput,
  WarmStateSerializeOutput
> {
  if (
    typeof Worker === 'undefined' ||
    typeof Blob === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return createMicrotaskExecutor()
  }

  let objectUrl: string | null = null
  try {
    const inner = createWorkerExecutor<
      WarmStateSerializeInput,
      WarmStateSerializeOutput
    >(() => {
      const blob = new Blob([WARM_SERIALIZE_WORKER_SOURCE], {
        type: 'text/javascript',
      })
      objectUrl = URL.createObjectURL(blob)
      return new Worker(objectUrl)
    })

    return {
      execute(request, isCurrent) {
        return inner.execute(request, isCurrent)
      },
      dispose() {
        inner.dispose()
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl)
          objectUrl = null
        }
      },
    }
  } catch {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    return createMicrotaskExecutor()
  }
}

export function createWarmSerializer(
  onState: Parameters<
    typeof createLatestComputation<WarmStateSerializeInput, WarmStateSerializeOutput>
  >[1]
) {
  return createLatestComputation<WarmStateSerializeInput, WarmStateSerializeOutput>(
    { createExecutor: createWebWorkerExecutor },
    onState
  )
}
