import { Button, Dialog, H1, Paragraph, Sheet, YStack } from 'tamagui'
import { Logo } from '~/features/brand/Logo'
import { testData } from '~/features/feed/testData'
import { ToggleThemeButton } from '~/features/theme/ToggleThemeButton'

export function loader() {
  return testData
}

export default function Test() {
  return (
    <>
      <Logo />
      <ToggleThemeButton />

      <YStack id="test-sub-box" w={500} h={500} bg="$color10">
        <Paragraph size="$4">Test Sub Sub</Paragraph>
      </YStack>

      <DialogTest />
    </>
  )
}

export const DialogTest = (props) => {
  return (
    <Dialog modal open={props.show}>
      <Dialog.Trigger>
        <Button>Open</Button>
      </Dialog.Trigger>

      <Dialog.Adapt when="sm">
        <Sheet zIndex={200000} modal dismissOnSnapToBottom animation="medium">
          <Sheet.Frame bg="$color2" padding={0} gap="$4">
            <Sheet.ScrollView>
              <Dialog.Adapt.Contents />
            </Sheet.ScrollView>
          </Sheet.Frame>
          <Sheet.Overlay animation="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
        </Sheet>
      </Dialog.Adapt>

      <Dialog.Portal>
        <Dialog.Overlay key="overlay" />

        <Dialog.Content key="content">
          <YStack bg="$red10" borderWidth={20} borderColor="$green10" w={350} h={350}>
            <H1>ok ok</H1>
          </YStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
