import * as React from 'react'
import type {
  CompiledMDX,
  Frontmatter,
  HastMdxAttribute,
  HastNode,
  HastPropertyValue,
  HastRoot,
} from './types'

export type {
  CompiledMDX,
  Frontmatter,
  HastMdxAttribute,
  HastNode,
  HastPropertyValue,
  HastRoot,
} from './types'
export type { StarterMDXVitePlugin } from './vite'

export type MDXComponents = Record<string, React.ElementType>

export type MDXProps = {
  hast: HastRoot
  components?: MDXComponents
}

function literalMdxProperties(
  attributes: readonly HastMdxAttribute[] | undefined,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  for (const attribute of attributes ?? []) {
    if (attribute.type === 'mdxJsxExpressionAttribute') {
      throw new Error('starter-mdx: spread attributes require build-time MDX')
    }
    if (typeof attribute.value === 'object' && attribute.value !== null) {
      throw new Error(
        `starter-mdx: expression attribute "${attribute.name}" requires build-time MDX`,
      )
    }
    properties[attribute.name] = attribute.value ?? true
  }
  return properties
}

function renderNode(
  node: HastNode,
  components: MDXComponents,
  key: string,
): React.ReactNode {
  switch (node.type) {
    case 'root':
      return React.createElement(
        React.Fragment,
        { key },
        ...node.children.map((child, index) =>
          renderNode(child, components, `${key}.${index}`),
        ),
      )
    case 'text':
      return node.value
    case 'comment':
    case 'doctype':
      return null
    case 'raw':
      throw new Error('starter-mdx: raw HTML is not rendered at runtime')
    case 'element': {
      const Component = components[node.tagName] ?? node.tagName
      const properties: Record<string, unknown> = { ...node.properties, key }
      if (Array.isArray(properties.className)) {
        properties.className = properties.className.join(' ')
      }
      return React.createElement(
        Component,
        properties,
        ...node.children.map((child, index) =>
          renderNode(child, components, `${key}.${index}`),
        ),
      )
    }
    case 'mdxJsxFlowElement':
    case 'mdxJsxTextElement': {
      if (node.name === null) {
        return React.createElement(
          React.Fragment,
          { key },
          ...node.children.map((child, index) =>
            renderNode(child, components, `${key}.${index}`),
          ),
        )
      }
      const Component = components[node.name]
      if (!Component) {
        throw new Error(`starter-mdx: missing component mapping for "${node.name}"`)
      }
      return React.createElement(
        Component,
        { ...literalMdxProperties(node.attributes), key },
        ...node.children.map((child, index) =>
          renderNode(child, components, `${key}.${index}`),
        ),
      )
    }
    case 'mdxFlowExpression':
    case 'mdxTextExpression':
    case 'mdxjsEsm':
      throw new Error(`starter-mdx: ${node.type} requires build-time MDX`)
  }
}

export function MDX({ hast, components = {} }: MDXProps): React.ReactElement {
  return <>{renderNode(hast, components, 'mdx')}</>
}
