/** Decode a HAST element property value from its wire `(kind, value)` — shared
 *  by the walk decoder and the snapshot reader so the kind dispatch lives once.
 *  The bool kinds carry no value string (callers pass `""`). */
import {
  PROP_BOOL_TRUE,
  PROP_BOOL_FALSE,
  PROP_SPACE_SEP,
  PROP_COMMA_SEP,
  PROP_COMMA_SEP_NUM,
  PROP_INT,
} from '../generated/wire-constants.js'
export function decodeElementProp(kind, value) {
  switch (kind) {
    case PROP_BOOL_TRUE:
      return true
    case PROP_BOOL_FALSE:
      return false
    case PROP_SPACE_SEP:
      return value.split(' ').filter((s) => s.length > 0)
    case PROP_COMMA_SEP: {
      // Interior empty items are kept; only a trailing empty is dropped.
      const items = value.split(',').map((s) => s.trim())
      if (items[items.length - 1] === '') items.pop()
      return items
    }
    case PROP_COMMA_SEP_NUM: {
      const items = value.split(',').map((s) => s.trim())
      if (items[items.length - 1] === '') items.pop()
      return items.map((s) => (s !== '' && !Number.isNaN(Number(s)) ? Number(s) : s))
    }
    case PROP_INT:
      return Number(value)
    default:
      return value // PROP_STRING
  }
}
