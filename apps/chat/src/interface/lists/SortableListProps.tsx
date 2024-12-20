import type { UniqueIdentifier } from '@dnd-kit/core'

export type SortableListProps<A extends { id: UniqueIdentifier }> = {
  items: A[]
  renderItem: (item: A) => any
  renderDraggingItem: (item: A) => any
  onDragStart?: (props: { id: string }) => void
  onSort?: (sortedItems: A[]) => void
}
