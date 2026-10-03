import { createMaterializer } from '../materializer-cache.js'
import { restorePhantomSpaces } from '../phantom.js'
import { TYPE_NAMES } from './generated/node-types.js'
import {
  HastReader,
  HAST_ROOT,
  HAST_ELEMENT,
  HAST_TEXT,
  HAST_COMMENT,
  HAST_RAW,
  HAST_MDX_JSX_ELEMENT,
  HAST_MDX_JSX_TEXT_ELEMENT,
  HAST_MDX_FLOW_EXPRESSION,
  HAST_MDX_TEXT_EXPRESSION,
  HAST_MDX_ESM,
} from './hast-reader.js'
/** Container node types (the ones that carry `children`); everything else is a leaf. */
export const HAST_CONTAINER_TYPES = new Set([
  HAST_ROOT,
  HAST_ELEMENT,
  HAST_MDX_JSX_ELEMENT,
  HAST_MDX_JSX_TEXT_ELEMENT,
])
const hastMaterializer = createMaterializer({
  label: 'materializeHastNode',
  typeNames: TYPE_NAMES,
  hasChildren: (nodeType) => HAST_CONTAINER_TYPES.has(nodeType),
  populate(node, reader, nodeId, nodeType) {
    switch (nodeType) {
      case HAST_ELEMENT: {
        node.tagName = reader.getElementTagName(nodeId)
        const count = reader.getElementPropCount(nodeId)
        const properties = {}
        for (let i = 0; i < count; i++) {
          properties[reader.getElementPropName(nodeId, i)] = reader.getElementPropValue(
            nodeId,
            i,
          )
        }
        node.properties = properties
        break
      }
      case HAST_TEXT:
      case HAST_COMMENT:
      case HAST_RAW:
        node.value = reader.getTextValue(nodeId)
        break
      case HAST_MDX_JSX_ELEMENT:
      case HAST_MDX_JSX_TEXT_ELEMENT: {
        const { name, attributes } = reader.getMdxJsxElementData(nodeId)
        node.name = name
        node.attributes = attributes
        break
      }
      case HAST_MDX_FLOW_EXPRESSION:
      case HAST_MDX_TEXT_EXPRESSION:
        node.value = restorePhantomSpaces(reader.getTextValue(nodeId))
        break
      case HAST_MDX_ESM:
        node.value = reader.getTextValue(nodeId)
        break
      // HAST_ROOT / HAST_DOCTYPE: no extra properties
      default:
        break
    }
  },
})
/**
 * Materialize a single HAST node; scalars eager, `children` lazy, memoized per
 * `(reader, id)`; `frozen` (the plugin walk path) deep-freezes so plugins
 * cannot corrupt the shared cache.
 */
export const materializeHastNode = hastMaterializer.node
/**
 * Materialize the full HAST tree from root (nodeId=0).
 */
export function materializeHastTree(reader) {
  return hastMaterializer.tree(reader, 0)
}
