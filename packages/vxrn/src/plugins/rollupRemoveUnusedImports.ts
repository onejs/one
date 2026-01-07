export const rollupRemoveUnusedImportsPlugin = {
  name: 'remove-unused-imports',
  renderChunk(code) {
    // Use a simple regex or AST parser to remove unused imports
    // Here, we use a regex to remove all imports, adapt as needed
    return {
      code: code.replace(/import\s+['"][a-zA-Z0-9_\-@]+['"];\n/g, ''),
      map: null,
    }
  },
}
