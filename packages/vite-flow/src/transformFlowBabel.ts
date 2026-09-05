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
  const fft = await import('fast-flow-transform')
  const result = await fft.default({
    filename: path || 'file.js',
    source: input,
    sourcemap: true,
    dialect: 'flow',
    format: 'pretty',
  })
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
