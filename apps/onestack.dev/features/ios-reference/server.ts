import index from '~/data/ios-reference/index.json'
import type { FrameworkDoc } from '../../../../packages/one/codegen/sdk/doc-types'

const frameworks = import.meta.glob<{ default: FrameworkDoc }>(
  '../../data/ios-reference/*.json'
)

export async function getFramework(name: string): Promise<FrameworkDoc> {
  if (!index.frameworks.some((f) => f.name === name))
    throw new Response('Framework not found', { status: 404 })
  const data = await frameworks[`../../data/ios-reference/${name}.json`]()
  return data.default
}

export function getType(doc: FrameworkDoc, name: string) {
  const type = doc.declarations.find((t) => t.name === name)
  if (!type) throw new Response('Type not found', { status: 404 })
  return type
}
