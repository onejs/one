import { Separator } from 'tamagui'
import { Flex } from './layout'
import { Text } from './text'

export const LabeledGroup = ({
  title,
  children,
}: { title?: string; children?: React.ReactNode }) => {
  return (
    <Flex p="$padding12" borderRadius="$rounded12" gap="$gap4">
      <Text>{title}</Text>
      <Separator />
      <Flex gap="$gap12">{children}</Flex>
    </Flex>
  )
}
