import { HastReader, materializeHastTree } from './hast/index.js'

export function compileMdxToHast(source, compile) {
  try {
    return materializeHastTree(new HastReader(compile(source)))
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error(String(error))
  }
}
