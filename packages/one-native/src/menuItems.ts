import type { NativeMenuItem } from './specs/OneNativeMenuNativeComponent'
import type { MenuItem } from './types'

export function flattenMenuItems(items: readonly MenuItem[]): NativeMenuItem[] {
  const result: NativeMenuItem[] = []
  const ids = new Set<string>()
  const append = (items: readonly MenuItem[], parentId: string) => {
    for (const item of items) {
      if (!item.id || ids.has(item.id)) {
        throw new Error(`Swift.Menu requires unique, nonempty item ids: "${item.id}"`)
      }
      ids.add(item.id)
      result.push({
        id: item.id,
        parentId,
        type: item.type,
        title: item.title,
        subtitle: item.subtitle ?? '',
        systemImage: item.systemImage ?? '',
        destructive: item.destructive ?? false,
        state: item.type === 'action' ? (item.state ?? 'off') : 'off',
        disabled: item.type === 'action' && (item.disabled ?? false),
        hidden: item.type === 'action' && (item.hidden ?? false),
        keepsMenuPresented: item.type === 'action' && (item.keepsMenuPresented ?? false),
        discoverabilityTitle:
          item.type === 'action' ? (item.discoverabilityTitle ?? '') : '',
        displayInline: item.type === 'submenu' && (item.displayInline ?? false),
        singleSelection: item.type === 'submenu' && (item.singleSelection ?? false),
        displayAsPalette: item.type === 'submenu' && (item.displayAsPalette ?? false),
        preferredElementSize:
          item.type === 'submenu'
            ? (item.preferredElementSize ?? 'automatic')
            : 'automatic',
      })
      if (item.type === 'submenu') append(item.children, item.id)
    }
  }
  append(items, '')
  return result
}
