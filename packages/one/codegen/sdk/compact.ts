// lower generated facades to tables without changing their declarations or ids.
import ts from 'typescript'

export function compactFacade(source: string): string {
  const file = ts.createSourceFile('framework.ts', source, ts.ScriptTarget.Latest, true)
  const edits: { start: number; end: number; text: string }[] = []
  let changed = false
  for (const statement of file.statements) {
    if (!ts.isClassDeclaration(statement) || !statement.name) continue
    const members: unknown[][] = []
    let module: string | undefined
    for (const member of statement.members) {
      if (!(ts.isMethodDeclaration(member) || ts.isGetAccessor(member) || ts.isSetAccessor(member))) continue
      if (!member.body || member.body.statements.length !== 1 || !member.name || !ts.isIdentifier(member.name)) continue
      const body = member.body.statements[0]
      const expression = ts.isReturnStatement(body) ? body.expression : ts.isExpressionStatement(body) ? body.expression : undefined
      if (!expression || !ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) continue
      const call = expression.expression.text
      if (call !== 'callSDK' && call !== 'callSDKAsync') continue
      const [framework, id, receiver, args, hints, sync] = expression.arguments
      if (!framework || !ts.isStringLiteral(framework) || !id || !ts.isNumericLiteral(id) || !args || !ts.isArrayLiteralExpression(args)) continue
      const isStatic = !!member.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword)
      if (isStatic ? receiver?.getText(file) !== 'undefined' : receiver?.kind !== ts.SyntaxKind.ThisKeyword) continue
      // out-pointer slots and unusual signatures retain their generated bodies.
      if (member.parameters.length > 8 || args.elements.length !== member.parameters.length ||
          member.parameters.some((p, i) => !ts.isIdentifier(p.name) || p.dotDotDotToken || p.initializer || args.elements[i].getText(file) !== p.name.text)) continue
      if (module && module !== framework.text) throw new Error('mixed framework class')
      module = framework.text
      const flags = Number(isStatic) | (ts.isGetAccessor(member) ? 2 : ts.isSetAccessor(member) ? 4 : 0) | (call === 'callSDKAsync' ? 8 : 0) | (sync?.kind === ts.SyntaxKind.TrueKeyword && call === 'callSDK' ? 16 : 0)
      const row: unknown[] = [member.name.text, Number(id.text), flags, member.parameters.length]
      if (hints) row.push(JSON.parse(hints.getText(file)))
      members.push(row)
      edits.push({ start: member.getFullStart(), end: member.end, text: '' })
    }
    if (members.length) {
      changed = true
      edits.push({ start: statement.end, end: statement.end, text: `\ndefineSDKMembers(${statement.name.text}, ${JSON.stringify(module)}, ${JSON.stringify(members)});` })
    }
  }
  for (const edit of edits.sort((a, b) => b.start - a.start))
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end)
  return changed ? `import { defineSDKMembers } from 'one/ios-runtime';\n${source}` : source
}
