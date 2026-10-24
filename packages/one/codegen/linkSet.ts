// the ios link set: native feature groups whose sources compile only when the
// build defines the group's condition (see ios-link-set.json and One.podspec).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type LinkSetGroup = {
  frameworks: readonly string[]
  components: readonly string[]
  hybrids: readonly string[]
}

export const linkSetGroups: Readonly<Record<string, LinkSetGroup>> = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'ios-link-set.json'), 'utf8')
).groups

export const linkSetCondition = (group: string) => `ONE_GROUP_${group.toUpperCase()}`

// groups whose framework types appear in the text, by module-qualified name
// (`PassKit.PKContact`, `_PassKit_SwiftUI.PayLaterViewAction`)
export function textGroups(text: string): string[] {
  return Object.entries(linkSetGroups)
    .filter(([, group]) =>
      group.frameworks.some((framework) =>
        new RegExp(`(?<![A-Za-z0-9_])_?${framework}(?:_SwiftUI)?\\.`).test(text)
      )
    )
    .map(([name]) => name)
}

export function groupsExpression(groups: readonly string[]): string {
  return groups.map(linkSetCondition).join(' && ')
}

// wraps swift or objective-c source in the preprocessor condition of its groups
export function gate(groups: readonly string[], text: string, otherwise = ''): string {
  if (!groups.length) return text
  return `#if ${groupsExpression(groups)}\n${text}\n${otherwise ? `#else\n${otherwise}\n` : ''}#endif`
}

// the generated file a group owns, by path under ios/
export function fileGroups(path: string): string[] {
  const name = path.split('/').pop()!
  const found: string[] = []
  for (const [group, { components, hybrids }] of Object.entries(linkSetGroups)) {
    if (
      components.some(
        (component) =>
          name === `${component}View.swift` ||
          name === `${component}ComponentView.mm`
      ) ||
      hybrids.some((hybrid) => name === `Hybrid${hybrid}.swift`)
    )
      found.push(group)
  }
  return found
}

// a disabled group still registers its component class (fabric looks up every
// provider entry by class name and a missing class would abort the lookup), as a
// view that renders nothing.
export function componentStub(source: string): string {
  const name = source.match(/@implementation (\w+)/)?.[1]
  if (!name) throw new Error('component view has no implementation')
  const descriptor = source.match(/concreteComponentDescriptorProvider<(\w+)>/)?.[1]
  // some descriptors are declared by the component's own shadow node header
  const shadowNode = source.match(/#import "\w+ShadowNode\.h"/)?.[0]
  return `#import "${name}.h"
${shadowNode ? `${shadowNode}\n` : ''}#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
using namespace facebook::react;
@implementation ${name}
+ (ComponentDescriptorProvider)componentDescriptorProvider { return concreteComponentDescriptorProvider<${descriptor}>(); }
@end`
}

// groups whose framework declares a derived modifier or whose types it takes or returns
export const modifierGroups = (modifier: { module?: string; frameworks?: readonly string[] }): string[] => [
  ...new Set([
    ...[modifier.module, ...(modifier.frameworks ?? [])].flatMap((framework) => framework ? frameworkGroups(framework) : []),
    ...textGroups(JSON.stringify(modifier)),
  ]),
]

// groups that own an imported framework or its swiftui overlay
export function frameworkGroups(framework: string): string[] {
  const name = framework.replace(/^_/, '').replace(/_SwiftUI$/, '')
  return Object.entries(linkSetGroups)
    .filter(([, group]) => group.frameworks.includes(name))
    .map(([group]) => group)
}
