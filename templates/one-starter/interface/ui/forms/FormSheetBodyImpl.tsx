import { ScrollView, YStack } from 'tamagui'
import type { FormSheetBodyProps, FormSheetFrameProps } from './formContract'

// the web leg. the route sheet's container gives the frame its box: a
// content-sized bottom sheet on narrow widths, an auto-height card on wide
// ones, both capped at the viewport. grow and shrink with a zero minimum size
// to content and scroll once the cap bites; flex would collapse in the card.
export function FormSheetFrame({ children, paddingBottom }: FormSheetFrameProps) {
  return (
    <YStack grow={1} shrink={1} minH={0} pb={paddingBottom}>
      {children}
    </YStack>
  )
}

export function FormSheetBody({ children }: FormSheetBodyProps) {
  return (
    <FormSheetFrame>
      <ScrollView
        grow={1}
        shrink={1}
        minH={0}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // react native longhands: the web ScrollView hands this style to its
        // content view unexpanded, so shorthands and tokens are dropped
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: 18,
          paddingHorizontal: 16,
          gap: 16,
        }}
      >
        {children}
      </ScrollView>
    </FormSheetFrame>
  )
}
