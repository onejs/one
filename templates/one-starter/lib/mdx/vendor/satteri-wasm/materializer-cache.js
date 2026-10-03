/**
 * Shared materializer machinery for the HAST and MDAST flavors: per-reader
 * node memo, lazy `children` descriptors, and the frozen-mode (plugin walk
 * path) freeze rules.
 */
import { deepFreeze } from './freeze.js'
/**
 * Build a memoizing materializer, memoized per `(reader, id)`.
 *
 * `node` materializes one node with lazy `children`; `frozen` (the plugin walk
 * path) deep-freezes every node at construction so plugins cannot corrupt the
 * shared cache. `tree` materializes a whole tree eagerly, which is what the
 * step-by-step API wants: it asked for the tree, so laziness would only add
 * per-node accessor overhead.
 */
export function createMaterializer(spec) {
  const readerCaches = new WeakMap()
  function materialize(reader, nodeId, frozen = false) {
    const cache = readerCache(reader, frozen)
    let node = cache.nodes.get(nodeId)
    if (node === undefined) {
      node = buildNode(reader, cache, nodeId)
      cache.nodes.set(nodeId, node)
    }
    return node
  }
  /** Frozen-mode `children`: memoized in `cache.childLists` because the node
   *  is frozen, so the accessor cannot self-replace with a data property. */
  function frozenChildrenDescriptor(reader, cache) {
    return {
      get() {
        const nodeId = this._nodeId
        let value = cache.childLists.get(nodeId)
        if (value === undefined) {
          const ids = reader.getChildIds(nodeId)
          const built = new Array(ids.length)
          let i = 0
          for (const childId of ids) built[i++] = materialize(reader, childId, true)
          value = Object.freeze(built)
          cache.childLists.set(nodeId, value)
        }
        return value
      },
      configurable: true,
      enumerable: true,
    }
  }
  /** Mutable-mode `children`: self-replacing with a plain writable array on
   *  first read. The id is captured rather than stored on the node, so a
   *  materialized tree carries no marker for `toEqual` or a spread to find. */
  function mutableChildrenDescriptor(reader, nodeId) {
    return {
      get() {
        const ids = reader.getChildIds(nodeId)
        const value = new Array(ids.length)
        let i = 0
        for (const childId of ids) value[i++] = materialize(reader, childId)
        Object.defineProperty(this, 'children', {
          value,
          writable: true,
          configurable: true,
          enumerable: true,
        })
        return value
      },
      configurable: true,
      enumerable: true,
    }
  }
  function readerCache(reader, frozen) {
    let cache = readerCaches.get(reader)
    if (cache === undefined) {
      cache = {
        nodes: new Map(),
        childLists: new Map(),
        children: undefined,
        frozen,
      }
      if (frozen) cache.children = frozenChildrenDescriptor(reader, cache)
      readerCaches.set(reader, cache)
    }
    if (cache.frozen !== frozen) {
      throw new Error(
        `${spec.label}: a reader cannot mix frozen and mutable materialization`,
      )
    }
    return cache
  }
  function buildNode(reader, cache, nodeId, eager = false) {
    const nodeType = reader.getNodeType(nodeId)
    const typeName = spec.typeNames[nodeType] ?? `unknown(${nodeType})`
    // Plain object, not a class: unified's `assertNode` rejects any other prototype.
    const node = { type: typeName }
    const position = reader.getPosition(nodeId)
    if (position !== undefined) {
      node.position = position
    }
    if (cache.frozen) {
      // Non-enumerable so `nid()` never trusts an id that a spread copied.
      Object.defineProperty(node, '_nodeId', {
        value: nodeId,
        writable: false,
        configurable: true,
        enumerable: false,
      })
    }
    spec.populate(node, reader, nodeId, nodeType)
    // Plugins can set `data` on any node type, so rehydrate generically
    // (see website/content/docs/divergences.md for the code-block case).
    const rawData = reader.getNodeData(nodeId)
    if (rawData !== null) {
      try {
        const parsed = JSON.parse(rawData)
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          Object.defineProperty(node, 'data', {
            value: parsed,
            writable: true,
            configurable: true,
            enumerable: true,
          })
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`${spec.label}: malformed node_data for nodeId=${nodeId}`, err)
        }
      }
    }
    if (!eager && spec.hasChildren(nodeType)) {
      Object.defineProperty(
        node,
        'children',
        cache.children ?? mutableChildrenDescriptor(reader, nodeId),
      )
    }
    if (cache.frozen) {
      // Deep-freeze the eager own values but not the lazy `children` accessor;
      // freeze eagerly even for containers so nothing is writable while cached.
      const descriptors = Object.getOwnPropertyDescriptors(node)
      for (const key of Object.keys(descriptors)) {
        const desc = descriptors[key]
        if (desc !== undefined && 'value' in desc) {
          deepFreeze(desc.value)
        }
      }
      Object.freeze(node)
    }
    return node
  }
  /**
   * Iterative on purpose: recursing to full document depth overflows on deeply
   * nested input, and nothing else here descends more than one level.
   *
   * Node ids are dense, so nodes live in a flat array rather than the memo Map:
   * one Map entry per node would outlive the whole build and reach old space,
   * where the tree is already the dominant cost.
   */
  function fillTree(reader, cache, rootId) {
    const byId = new Array(reader.nodeCount)
    const parents = []
    const stack = [rootId]
    const root = buildNode(reader, cache, rootId, true)
    byId[rootId] = root
    for (;;) {
      const id = stack.pop()
      if (id === undefined) break
      if (byId[id] === undefined) byId[id] = buildNode(reader, cache, id, true)
      if (spec.hasChildren(reader.getNodeType(id))) {
        parents.push(id)
        reader.pushChildIds(id, stack)
      }
    }
    for (const id of parents) {
      const ids = reader.getChildIds(id)
      const kids = new Array(ids.length)
      let i = 0
      for (const childId of ids) {
        const kid = byId[childId]
        if (kid !== undefined) kids[i] = kid
        i++
      }
      // Assignment beats defineProperty here; `eager` left `children` uninstalled.
      byId[id].children = kids
    }
    return root
  }
  /** Whole tree at once: the caller will walk it, so lazy accessors cost more than they defer. */
  function materializeTree(reader, rootId) {
    return fillTree(reader, readerCache(reader, false), rootId)
  }
  return { node: materialize, tree: materializeTree }
}
