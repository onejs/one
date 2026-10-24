// share framework call prefixes without changing class or member syntax.
import { parse } from '@babel/parser'
import { VISITOR_KEYS, type Node } from '@babel/types'

export function compactFacade(source: string): string {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })
  const edits: { start: number; end: number; text: string }[] = []
  const modules = new Map<string, { index: number; calls: Set<string> }>()
  function visit(node: Node) {
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      ['callSDK', 'callSDKAsync'].includes(node.callee.name)
    ) {
      const [framework, id] = node.arguments
      if (framework?.type === 'StringLiteral' && id?.type === 'NumericLiteral') {
        let entry = modules.get(framework.value)
        if (!entry) {
          entry = { index: modules.size, calls: new Set() }
          modules.set(framework.value, entry)
        }
        entry.calls.add(node.callee.name)
        edits.push({
          start: node.callee.start!,
          end: id.start!,
          text: `$${node.callee.name}${entry.index}(`,
        })
      }
    }
    for (const key of VISITOR_KEYS[node.type] ?? []) {
      const child = Reflect.get(node, key) as Node | Node[] | null
      if (Array.isArray(child)) for (const item of child) visit(item)
      else if (child) visit(child)
    }
  }
  visit(ast)
  for (const edit of edits.sort((a, b) => b.start - a.start))
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end)
  let prefix = ''
  for (const [framework, { index, calls }] of modules)
    for (const call of calls)
      prefix += `function $${call}${index}(id,self,args,hints,sync){return ${call}(${JSON.stringify(framework)},id,self,args,hints,sync)}\n`
  return prefix + source
}
