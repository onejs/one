import { SizableText, Square, XStack } from 'tamagui'
import { APP_NAME } from '~/constants'

// the brand wordmark + glyph. the glyph initial derives from APP_NAME and the
// fill is the solid brand surface via accent-background + accent-color, so re-branding
// (themes.ts accent ramp + constants APP_NAME) carries through here with no edit.
// don't reintroduce a hardcoded letter or `$blue-900`/`$red-900` fill — they drift
// off-brand the moment the app is renamed or re-accented.
const LOGO_INITIAL = APP_NAME.slice(0, 1).toUpperCase()

export function Logo() {
  return (
    <XStack items="center" gap={7}>
      <Square size={30} rounded="4" bg="accent-background">
        <SizableText color="accent-color" fontWeight="800" size="5">
          {LOGO_INITIAL}
        </SizableText>
      </Square>
      <SizableText fontWeight="800" size="5" letterSpacing={0}>
        {APP_NAME}
      </SizableText>
    </XStack>
  )
}
