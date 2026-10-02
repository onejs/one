import { router } from 'one'
import { Pressable } from '~/interface/buttons/Pressable'
import { CaretLeftIcon } from '~/interface/icons/phosphor/CaretLeftIcon'
import type { GetProps } from 'tamagui'
export const HeaderBackButton = (props: GetProps<typeof Pressable>) => {
  return (
    <Pressable
      onPress={() => router.back()}
      w={36}
      h={36}
      items="center"
      justify="center"
      {...props}
    >
      <CaretLeftIcon size={24} />
    </Pressable>
  )
}
