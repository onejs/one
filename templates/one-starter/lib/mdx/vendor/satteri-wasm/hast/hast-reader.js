import { ARENA_MAGIC, KIND_HAST, FIELD, HEADER } from '../generated/arena-layout.js'
import {
  MDX_ATTR_BOOLEAN_PROP,
  MDX_ATTR_LITERAL_PROP,
  MDX_ATTR_EXPRESSION_PROP,
  MDX_ATTR_SPREAD,
} from '../generated/wire-constants.js'
import { restorePhantomSpaces } from '../phantom.js'
import { readPosition } from '../wire-read.js'
import { decodeElementProp } from './element-props.js'
import { NAME_TO_TYPE } from './generated/node-types.js'
export const HAST_ROOT = NAME_TO_TYPE.root
export const HAST_ELEMENT = NAME_TO_TYPE.element
export const HAST_TEXT = NAME_TO_TYPE.text
export const HAST_COMMENT = NAME_TO_TYPE.comment
export const HAST_RAW = NAME_TO_TYPE.raw
export const HAST_MDX_JSX_ELEMENT = NAME_TO_TYPE.mdxJsxFlowElement
export const HAST_MDX_JSX_TEXT_ELEMENT = NAME_TO_TYPE.mdxJsxTextElement
export const HAST_MDX_FLOW_EXPRESSION = NAME_TO_TYPE.mdxFlowExpression
export const HAST_MDX_ESM = NAME_TO_TYPE.mdxjsEsm
export const HAST_MDX_TEXT_EXPRESSION = NAME_TO_TYPE.mdxTextExpression
export class HastReader {
  #view
  #header
  #textDecoder
  #stringPoolCache = null
  #poolIsAscii = null
  constructor(buffer) {
    if (buffer instanceof Uint8Array) {
      this.#view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    } else {
      this.#view = new DataView(buffer)
    }
    this.#textDecoder = new TextDecoder('utf-8', { ignoreBOM: true })
    this.#header = this.#readHeader()
  }
  #readHeader() {
    const v = this.#view
    const magic = v.getUint32(HEADER.magic, true)
    if (magic !== ARENA_MAGIC) {
      throw new Error(`Invalid HAST buffer: bad magic 0x${magic.toString(16)}`)
    }
    const kind = v.getUint32(HEADER.kind, true)
    if (kind !== KIND_HAST) {
      throw new Error(
        `HastReader was handed a buffer of kind ${kind} (expected ${KIND_HAST}). ` +
          `MDAST and HAST node types overlap; reading the wrong kind decodes garbage.`,
      )
    }
    return {
      nodeStructSize: v.getUint32(HEADER.node_struct_size, true),
      nodeCount: v.getUint32(HEADER.node_count, true),
      nodesOffset: v.getUint32(HEADER.nodes_offset, true),
      childrenCount: v.getUint32(HEADER.children_count, true),
      childrenOffset: v.getUint32(HEADER.children_offset, true),
      typeDataLen: v.getUint32(HEADER.type_data_len, true),
      typeDataOffset: v.getUint32(HEADER.type_data_offset, true),
      stringPoolLen: v.getUint32(HEADER.string_pool_len, true),
      stringPoolOffset: v.getUint32(HEADER.string_pool_offset, true),
      nodeDataCount: v.getUint32(HEADER.node_data_count, true),
      nodeDataOffset: v.getUint32(HEADER.node_data_offset, true),
    }
  }
  #nodeDataTable = null
  /**
   * Per-node JSON `data` blob (set via `Arena::set_node_data` on the Rust
   * side). Returns `null` when the node has no entry. Lazy-builds a
   * `Map<id, string>` on first call so a materialization pass on a
   * data-heavy tree stays O(nodes) rather than O(nodes × entries).
   */
  getNodeData(nodeId) {
    if (this.#header.nodeDataCount === 0) return null
    if (this.#nodeDataTable === null) {
      this.#nodeDataTable = new Map()
      const v = this.#view
      let pos = this.#header.nodeDataOffset
      for (let i = 0; i < this.#header.nodeDataCount; i++) {
        const id = v.getUint32(pos, true)
        pos += 4
        const len = v.getUint32(pos, true)
        pos += 4
        const slice = new Uint8Array(this.#view.buffer, this.#view.byteOffset + pos, len)
        this.#nodeDataTable.set(id, this.#textDecoder.decode(slice))
        pos += len
      }
    }
    return this.#nodeDataTable.get(nodeId) ?? null
  }
  get nodeCount() {
    return this.#header.nodeCount
  }
  get header() {
    return { ...this.#header }
  }
  /** The full string pool (original input + interning heap). Not the document
   * source as written; for that, read `ctx.source` from a plugin. */
  getStringPool() {
    if (this.#stringPoolCache === null) {
      const { stringPoolOffset, stringPoolLen } = this.#header
      const bytes = new Uint8Array(
        this.#view.buffer,
        this.#view.byteOffset + stringPoolOffset,
        stringPoolLen,
      )
      this.#stringPoolCache = this.#textDecoder.decode(bytes)
    }
    return this.#stringPoolCache
  }
  /** Read a substring from the string pool by byte offset and length. */
  getString(offset, len) {
    if (len === 0) return ''
    if (this.#poolIsAscii === null) {
      this.#poolIsAscii = this.getStringPool().length === this.#header.stringPoolLen
    }
    // An all-ASCII pool has byte offsets equal to its UTF-16 indices, so one
    // decode plus substrings beats a TextDecoder call per string.
    if (this.#poolIsAscii) {
      return this.getStringPool().substring(offset, offset + len)
    }
    const { stringPoolOffset } = this.#header
    const bytes = new Uint8Array(
      this.#view.buffer,
      this.#view.byteOffset + stringPoolOffset + offset,
      len,
    )
    return this.#textDecoder.decode(bytes)
  }
  /** Get position data for a node. */
  getPosition(nodeId) {
    const base = this.#header.nodesOffset + nodeId * this.#header.nodeStructSize
    return readPosition(this.#view, base + FIELD.start_offset)
  }
  /** Get the node_type byte for a given node ID. */
  getNodeType(nodeId) {
    const { nodesOffset, nodeStructSize } = this.#header
    return this.#view.getUint8(nodesOffset + nodeId * nodeStructSize + FIELD.node_type)
  }
  /** Get the parent id for a given node (0xffffffff at the root). */
  getParentId(nodeId) {
    const { nodesOffset, nodeStructSize } = this.#header
    return this.#view.getUint32(
      nodesOffset + nodeId * nodeStructSize + FIELD.parent,
      true,
    )
  }
  /** Get child node IDs for a given node. */
  getChildIds(nodeId) {
    const base = this.#header.nodesOffset + nodeId * this.#header.nodeStructSize
    const v = this.#view
    const childrenStart = v.getUint32(base + FIELD.children_start, true)
    const childrenCount = v.getUint32(base + FIELD.children_count, true)
    if (childrenCount === 0) return []
    const { childrenOffset } = this.#header
    const ids = []
    for (let i = 0; i < childrenCount; i++) {
      ids.push(v.getUint32(childrenOffset + (childrenStart + i) * 4, true))
    }
    return ids
  }
  /** Push child node IDs directly onto a stack array (reverse order for depth-first). */
  pushChildIds(nodeId, stack) {
    const base = this.#header.nodesOffset + nodeId * this.#header.nodeStructSize
    const v = this.#view
    const childrenStart = v.getUint32(base + FIELD.children_start, true)
    const childrenCount = v.getUint32(base + FIELD.children_count, true)
    if (childrenCount === 0) return
    const { childrenOffset } = this.#header
    for (let i = childrenCount - 1; i >= 0; i--) {
      stack.push(v.getUint32(childrenOffset + (childrenStart + i) * 4, true))
    }
  }
  /** Get the raw type_data bytes for a node. */
  getTypeData(nodeId) {
    const base = this.#header.nodesOffset + nodeId * this.#header.nodeStructSize
    const v = this.#view
    const dataOffset = v.getUint32(base + FIELD.data_offset, true)
    const dataLen = v.getUint32(base + FIELD.data_len, true)
    if (dataLen === 0) return new Uint8Array(0)
    return new Uint8Array(
      this.#view.buffer,
      this.#view.byteOffset + this.#header.typeDataOffset + dataOffset,
      dataLen,
    )
  }
  /** Read a StringRef (offset: u32 LE, len: u32 LE) from a byte array at byteOffset. */
  #readStringRef(data, byteOffset) {
    const at = data.byteOffset - this.#view.byteOffset + byteOffset
    return {
      offset: this.#view.getUint32(at, true),
      len: this.#view.getUint32(at + 4, true),
    }
  }
  /**
   * Get element data for a HAST_ELEMENT node.
   *
   * Element type_data layout:
   *   [tag_name: StringRef(8B)][prop_count: u32(4B)][_pad: u32(4B)] = 16-byte header
   *   then prop_count * 20 bytes:
   *     [name: StringRef(8B)][value_type: u8(1B)][_pad: [u8;3](3B)][value: StringRef(8B)]
   */
  /** Byte position of a node's `type_data`, relative to this reader's view, or
   *  `-1` when the node stores fewer than `min` bytes. */
  #typeDataAt(nodeId, min) {
    const base = this.#header.nodesOffset + nodeId * this.#header.nodeStructSize
    const v = this.#view
    if (v.getUint32(base + FIELD.data_len, true) < min) return -1
    return this.#header.typeDataOffset + v.getUint32(base + FIELD.data_offset, true)
  }
  #stringAt(at) {
    return this.getString(
      this.#view.getUint32(at, true),
      this.#view.getUint32(at + 4, true),
    )
  }
  /** Element `tagName`, `properties` count, and the i-th property, read without
   *  building the intermediate views and records `getElementData` allocates. */
  getElementTagName(nodeId) {
    const at = this.#typeDataAt(nodeId, 16)
    return at === -1 ? '' : this.#stringAt(at)
  }
  getElementPropCount(nodeId) {
    const at = this.#typeDataAt(nodeId, 16)
    return at === -1 ? 0 : this.#view.getUint32(at + 8, true)
  }
  getElementPropName(nodeId, index) {
    const at = this.#typeDataAt(nodeId, 16)
    return at === -1 ? '' : this.#stringAt(at + 16 + index * 20)
  }
  getElementPropValue(nodeId, index) {
    const at = this.#typeDataAt(nodeId, 16)
    if (at === -1) return ''
    const base = at + 16 + index * 20
    return decodeElementProp(this.#view.getUint8(base + 8), this.#stringAt(base + 12))
  }
  getElementData(nodeId) {
    const data = this.getTypeData(nodeId)
    if (data.length < 16) {
      return { tagName: '', properties: [] }
    }
    const tagRef = this.#readStringRef(data, 0)
    const tagName = this.getString(tagRef.offset, tagRef.len)
    const view = new DataView(data.buffer, data.byteOffset + 8)
    const propCount = view.getUint32(0, true)
    const properties = []
    for (let i = 0; i < propCount; i++) {
      const base = 16 + i * 20
      const nameRef = this.#readStringRef(data, base)
      const name = this.getString(nameRef.offset, nameRef.len)
      const valueType = data[base + 8]
      const valueRef = this.#readStringRef(data, base + 12)
      const valueStr = this.getString(valueRef.offset, valueRef.len)
      properties.push({ name, value: decodeElementProp(valueType, valueStr) })
    }
    return { tagName, properties }
  }
  /**
   * Get MDX JSX element data: name and attributes.
   *
   * MDX JSX element type_data layout:
   *   [name: StringRef(8B)][attr_count: u32(4B)][_pad: u32(4B)] = 16-byte header
   *   then attr_count * 20 bytes:
   *     [kind: u8(1B)][_pad: [u8;3](3B)][name: StringRef(8B)][value: StringRef(8B)]
   */
  getMdxJsxElementData(nodeId) {
    const data = this.getTypeData(nodeId)
    if (data.length < 16) {
      return { name: null, attributes: [] }
    }
    const nameRef = this.#readStringRef(data, 0)
    const name = nameRef.len > 0 ? this.getString(nameRef.offset, nameRef.len) : null
    const view = new DataView(data.buffer, data.byteOffset + 8)
    const attrCount = view.getUint32(0, true)
    const attributes = []
    for (let i = 0; i < attrCount; i++) {
      const base = 16 + i * 20
      const kind = data[base]
      const attrNameRef = this.#readStringRef(data, base + 4)
      const attrValueRef = this.#readStringRef(data, base + 12)
      switch (kind) {
        case MDX_ATTR_BOOLEAN_PROP:
          attributes.push({
            type: 'mdxJsxAttribute',
            name: this.getString(attrNameRef.offset, attrNameRef.len),
            value: null,
          })
          break
        case MDX_ATTR_LITERAL_PROP:
          attributes.push({
            type: 'mdxJsxAttribute',
            name: this.getString(attrNameRef.offset, attrNameRef.len),
            value: this.getString(attrValueRef.offset, attrValueRef.len),
          })
          break
        case MDX_ATTR_EXPRESSION_PROP:
          attributes.push({
            type: 'mdxJsxAttribute',
            name: this.getString(attrNameRef.offset, attrNameRef.len),
            value: {
              type: 'mdxJsxAttributeValueExpression',
              value: restorePhantomSpaces(
                this.getString(attrValueRef.offset, attrValueRef.len),
              ),
            },
          })
          break
        case MDX_ATTR_SPREAD:
          attributes.push({
            type: 'mdxJsxExpressionAttribute',
            value: restorePhantomSpaces(
              this.getString(attrValueRef.offset, attrValueRef.len),
            ),
          })
          break
      }
    }
    return { name, attributes }
  }
  /**
   * Get the string value for HAST_TEXT, HAST_COMMENT, or HAST_RAW nodes.
   * These store a single StringRef (8 bytes) as their type_data.
   */
  getTextValue(nodeId) {
    const at = this.#typeDataAt(nodeId, 8)
    return at === -1 ? '' : this.#stringAt(at)
  }
}
