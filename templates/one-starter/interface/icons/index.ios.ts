import { sfSymbol } from '~/interface/ui/icons/sfSymbol'
import { Icons as BaseIcons } from './base'

// ios draws the system symbol wherever iOS itself would, and keeps the shared
// drawing everywhere else. spread first, override second: an icon added to
// base.ts works here immediately and gets a symbol later if it deserves one.
//
// settings rows and navigation chrome are where a system symbol earns its
// place, because that is what every other iOS app puts there. app identity
// icons, tab bars and category art stay on the shared set on purpose.
export const Icons = {
  ...BaseIcons,
  Back: sfSymbol('chevron.left', { weight: 'semibold' }),
  Close: sfSymbol('xmark', { weight: 'semibold' }),
  Create: sfSymbol('plus', { weight: 'semibold' }),
  Disclosure: sfSymbol('chevron.right', { weight: 'semibold' }),
  Feedback: sfSymbol('bubble.left'),
  Mail: sfSymbol('envelope'),
  Menu: sfSymbol('line.3.horizontal'),
  Messages: sfSymbol('bubble.left.and.bubble.right'),
  Notifications: sfSymbol('bell'),
  Passcode: sfSymbol('key'),
  Paste: sfSymbol('clipboard'),
  Photo: sfSymbol('photo'),
  Privacy: sfSymbol('lock'),
  Profile: sfSymbol('person'),
  Settings: sfSymbol('gearshape'),
  SignOut: sfSymbol('rectangle.portrait.and.arrow.right'),
  Terms: sfSymbol('doc.text'),
  Upload: sfSymbol('square.and.arrow.up'),
}

export type { AppIconName } from './base'
