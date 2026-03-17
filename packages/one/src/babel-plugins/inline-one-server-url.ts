/**
 * babel plugin that inlines process.env.ONE_SERVER_URL at build time
 * so native prod bundles know where to fetch loaders from.
 */
export default function pluginInlineOneServerUrl() {
  const serverUrl = process.env.ONE_SERVER_URL

  return {
    visitor: {
      MemberExpression(nodePath: any) {
        const { node } = nodePath
        if (
          node.object?.type === 'MemberExpression' &&
          node.object.object?.name === 'process' &&
          node.object.property?.name === 'env' &&
          node.property?.name === 'ONE_SERVER_URL'
        ) {
          nodePath.replaceWith({
            type: 'StringLiteral',
            value: serverUrl || '',
          })
        }
      },
    },
  }
}
