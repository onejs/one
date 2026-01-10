import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'

export type InjectMode = 'type' | 'runtime'

/**
 * Injects route type helpers into a route file if they don't already exist.
 *
 * This function:
 * - Checks if the file already has `type Route` or `const route` declarations
 * - Adds them if missing with proper spacing (blank line after imports)
 * - Tries to add imports to existing `import {} from 'one'` statements
 * - Does NOT modify existing loader code - that's up to the user
 */
export async function injectRouteHelpers(
  filePath: string,
  routePath: string,
  mode: InjectMode
): Promise<boolean> {
  if (!existsSync(filePath)) {
    return false
  }

  try {
    let content = await readFile(filePath, 'utf-8')
    let modified = false

    // Check if already has type Route or const route
    const hasTypeRoute = /^type\s+Route\s*=/m.test(content)
    const hasConstRoute = /^const\s+route\s*=/m.test(content)

    // If runtime mode and doesn't have const route, add it
    if (mode === 'runtime' && !hasConstRoute) {
      const { updatedContent } = addCreateRouteImport(content)
      content = updatedContent

      // Add const route declaration after imports with blank line before
      const routeDeclaration = `const route = createRoute<'${routePath}'>()`
      content = insertAfterImports(content, routeDeclaration)
      modified = true
    }

    // If type mode and doesn't have type Route, add it
    if (mode === 'type' && !hasTypeRoute) {
      const { updatedContent } = addRouteTypeImport(content)
      content = updatedContent

      // Add type Route declaration after imports with blank line before
      const typeDeclaration = `type Route = RouteType<'${routePath}'>`
      content = insertAfterImports(content, typeDeclaration)
      modified = true
    }

    if (modified) {
      await writeFile(filePath, content, 'utf-8')
      return true
    }

    return false
  } catch (error) {
    console.error(`Failed to inject route helpers into ${filePath}:`, error)
    return false
  }
}

/**
 * Adds createRoute to an existing import from 'one', or creates a new import
 */
function addCreateRouteImport(content: string): {
  updatedContent: string
  importAdded: boolean
} {
  // Check if already imports createRoute
  if (/import\s+[^'"]*createRoute[^'"]*from\s+['"]one['"]/m.test(content)) {
    return { updatedContent: content, importAdded: false }
  }

  // Try to find existing import from 'one'
  const oneImportRegex = /import\s+{([^}]*)}\s+from\s+['"]one['"]/m
  const match = content.match(oneImportRegex)

  if (match) {
    // Add createRoute to existing import
    const existingImports = match[1].trim()
    const newImports = existingImports ? `${existingImports}, createRoute` : 'createRoute'
    const updatedContent = content.replace(
      oneImportRegex,
      `import { ${newImports} } from 'one'`
    )
    return { updatedContent, importAdded: true }
  }

  // No existing import, add a new one after the last import
  const lastImportIndex = findLastImportIndex(content)
  if (lastImportIndex >= 0) {
    const lines = content.split('\n')
    lines.splice(lastImportIndex + 1, 0, `import { createRoute } from 'one'`)
    return { updatedContent: lines.join('\n'), importAdded: true }
  }

  // No imports at all, add at the top
  const newImport = `import { createRoute } from 'one'\n`
  return { updatedContent: newImport + content, importAdded: true }
}

/**
 * Adds RouteType to an existing type import from 'one', or creates a new import
 */
function addRouteTypeImport(content: string): {
  updatedContent: string
  importAdded: boolean
} {
  // Check if already imports RouteType
  if (/import\s+type\s+[^'"]*RouteType[^'"]*from\s+['"]one['"]/m.test(content)) {
    return { updatedContent: content, importAdded: false }
  }

  // Try to find existing type import from 'one'
  const oneTypeImportRegex = /import\s+type\s+{([^}]*)}\s+from\s+['"]one['"]/m
  const match = content.match(oneTypeImportRegex)

  if (match) {
    // Add RouteType to existing import
    const existingImports = match[1].trim()
    const newImports = existingImports ? `${existingImports}, RouteType` : 'RouteType'
    const updatedContent = content.replace(
      oneTypeImportRegex,
      `import type { ${newImports} } from 'one'`
    )
    return { updatedContent, importAdded: true }
  }

  // No existing type import, add a new one after the last import
  const lastImportIndex = findLastImportIndex(content)
  if (lastImportIndex >= 0) {
    const lines = content.split('\n')
    lines.splice(lastImportIndex + 1, 0, `import type { RouteType } from 'one'`)
    return { updatedContent: lines.join('\n'), importAdded: true }
  }

  // No imports at all, add at the top
  const newImport = `import type { RouteType } from 'one'\n`
  return { updatedContent: newImport + content, importAdded: true }
}

/**
 * Finds the index of the last import statement line
 */
function findLastImportIndex(content: string): number {
  const lines = content.split('\n')
  let lastImportIndex = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (
      line.startsWith('import ') ||
      (lastImportIndex >= 0 && (line.startsWith('from ') || line === '}'))
    ) {
      lastImportIndex = i
    } else if (lastImportIndex >= 0 && line && !line.startsWith('//')) {
      // Stop once we hit non-import code
      break
    }
  }

  return lastImportIndex
}

/**
 * Inserts code after the last import statement with proper spacing
 * Ensures there's a blank line between imports and the inserted code, and after the inserted code
 */
function insertAfterImports(content: string, codeToInsert: string): string {
  const lines = content.split('\n')
  const lastImportIndex = findLastImportIndex(content)

  if (lastImportIndex >= 0) {
    // Check if there's already a blank line after imports
    const nextLine = lines[lastImportIndex + 1]
    const hasBlankLine = nextLine === ''

    if (hasBlankLine) {
      // Insert after the blank line with a blank line after
      lines.splice(lastImportIndex + 2, 0, codeToInsert, '')
    } else {
      // Add blank line before and after code
      lines.splice(lastImportIndex + 1, 0, '', codeToInsert, '')
    }

    return lines.join('\n')
  }

  // No imports found, add at the beginning with spacing
  return codeToInsert + '\n\n' + content
}
