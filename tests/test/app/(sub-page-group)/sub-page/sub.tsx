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

      <YStack id="test-sub-box" width={500} height={500} backgroundColor="color10">
        <Paragraph size="4">Test Sub Sub</Paragraph>
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
        <Sheet zIndex={200000} modal dismissOnSnapToBottom transition="medium">
          <Sheet.Container padding={0} gap="4">
            <Sheet.Background backgroundColor="color2" />
            <Sheet.ScrollView>
              <Dialog.Adapt.Contents />
            </Sheet.ScrollView>
          </Sheet.Container>
          <Sheet.Overlay transition="lazy" opacity="enter:0 exit:0" />
        </Sheet>
      </Dialog.Adapt>

      <Dialog.Portal>
        <Dialog.Overlay key="overlay" />

        <Dialog.Content key="content">
          <YStack
            backgroundColor="red10"
            borderWidth={20}
            borderColor="green10"
            width={350}
            height={350}
          >
            <H1>ok ok</H1>
          </YStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
