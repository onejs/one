import type { UniqueIdentifier } from '@dnd-kit/core'
import type { SortableListProps } from './SortableListProps'

export function SortableList<A extends { id: UniqueIdentifier }>({
  items,
  renderItem,
  renderDraggingItem,
  onSort,
  onDragStart,
}: SortableListProps<A>) {
  // TODO
  return <>{items.map((item) => renderItem(item))}</>
}
