import { H6 } from 'tamagui'
import { ListItem, type ListItemProps } from './ListItem'

export const ListTitle = ({ children, ...props }: ListItemProps) => {
  return (
    <ListItem disableHover {...props}>
      <H6 size="$4" o={0.5}>
        {children}
      </H6>
    </ListItem>
  )
}
