import { useRef } from 'react'
import { Popover, Separator, type PopoverProps } from 'tamagui'
import { PopoverContent } from '../Popover'
import { ListItem, type ListItemProps } from '../lists/ListItem'

export type MenuProps = {
  size?: ListItemProps['size']
  items: ({ separator: true } | (ListItemProps & { id: string }))[]
  popoverProps?: PopoverProps
  trigger: any
}

export const Menu = ({ items, trigger, popoverProps, size = 'large' }: MenuProps) => {
  const popoverRef = useRef<Popover>(null)

  return (
    <Popover ref={popoverRef} allowFlip stayInFrame={{ padding: 10 }} {...popoverProps}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>

      <PopoverContent ov="hidden" miw={200}>
        {items?.map((item) => {
          if ('separator' in item) {
            return <Separator width="100%" my={4} />
          }
          return (
            <ListItem
              key={item.id}
              size={size}
              {...item}
              onPress={async (e) => {
                await item.onPress?.(e)
                popoverRef.current?.close()
              }}
            />
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
