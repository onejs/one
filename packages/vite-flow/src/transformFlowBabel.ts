export interface TransformFlowResult {
  code: string
  map: any
  toString(): string
}

export async function transformFlow(
  input: string,
  options?: { development?: boolean; path?: string }
): Promise<TransformFlowResult> {
  const path = options?.path
  const result = await stripFlowTypes(path || 'file.js', input)
  return {
    code: result.code,
    map: result.map,
    toString() {
      return result.code
    },
  }
}

export async function transformFlowBabel(
  input: string,
  options?: { development?: boolean; path?: string }
): Promise<string> {
  const res = await transformFlow(input, options)
  return res.code
}
import { stripFlowTypes } from '@vxrn/compiler'
