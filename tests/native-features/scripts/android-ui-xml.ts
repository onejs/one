// uiautomator may choose either quote style when an attribute contains quotes.
export function androidXmlAttributes(source: string): Record<string, string> {
  const result: Record<string, string> = {}
  const pattern = /([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*(["'])([\s\S]*?)\2/g
  for (const match of source.matchAll(pattern)) {
    result[match[1]] = match[3].replace(
      /&(#x[0-9a-f]+|#\d+|quot|apos|lt|gt|amp);/gi,
      (entity, name: string) => {
        if (name.startsWith('#')) {
          const code = name[1].toLowerCase() === 'x'
            ? Number.parseInt(name.slice(2), 16) : Number.parseInt(name.slice(1), 10)
          if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return entity
          return String.fromCodePoint(code)
        }
        return ({ quot: '"', apos: "'", lt: '<', gt: '>', amp: '&' } as Record<string, string>)[name.toLowerCase()]
      }
    )
  }
  return result
}
