import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useState } from 'react'
import type { SortableListProps } from './SortableListProps'

export function SortableList<A extends { id: UniqueIdentifier }>({
  items,
  renderItem,
  renderDraggingItem,
  onSort,
  onDragStart,
}: SortableListProps<A>) {
  const [dragging, setDragging] = useState<A | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        distance: {
          y: 8,
        },
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => {
        const { active } = event
        setDragging(items.find((x) => x.id === `${active.id}`) || null)
        onDragStart?.({ id: `${active.id}` })
      }}
      onDragEnd={(event) => {
        setDragging(null)
        const { active, over } = event
        if (over && active.id !== over.id) {
          const oldIndex = items.findIndex((x) => x.id === (`${active.id}` as any))
          const newIndex = items.findIndex((x) => x.id === (`${over.id}` as any))
          const nextChannelSort = arrayMove(items as any, oldIndex, newIndex)
          console.log('sort is now', nextChannelSort)
          onSort?.(nextChannelSort as any)
        }
      }}
    >
      <SortableContext items={items as any} strategy={verticalListSortingStrategy}>
        {items.map((item) => renderItem(item))}

        <DragOverlay
          style={{
            zIndex: 1000,
          }}
        >
          {dragging ? renderDraggingItem(dragging) : null}
        </DragOverlay>
      </SortableContext>
    </DndContext>
  )
}
