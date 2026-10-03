import { Bell } from './lucide/Bell'
import { ChevronLeft } from './lucide/ChevronLeft'
import { ChevronRight } from './lucide/ChevronRight'
import { Clipboard } from './lucide/Clipboard'
import { FileText } from './lucide/FileText'
import { Image } from './lucide/Image'
import { KeyRound } from './lucide/KeyRound'
import { Lock } from './lucide/Lock'
import { LogOut } from './lucide/LogOut'
import { Mail } from './lucide/Mail'
import { Menu } from './lucide/Menu'
import { MessageSquare } from './lucide/MessageSquare'
import { Plus } from './lucide/Plus'
import { Settings } from './lucide/Settings'
import { Upload } from './lucide/Upload'
import { User } from './lucide/User'
import { X } from './lucide/X'
import type { Icon } from '~/interface/ui/icons/types'

// every icon this app names, drawn the same way on every platform. a platform
// file beside this one overrides the entries that should be native there; see
// index.ios.ts. this file is the fallback for all of them, so an icon added
// here works everywhere before anyone picks a native equivalent.
export const Icons = {
  Back: ChevronLeft,
  Close: X,
  Create: Plus,
  Disclosure: ChevronRight,
  Feedback: MessageSquare,
  Mail: Mail,
  Menu: Menu,
  Messages: MessageSquare,
  Notifications: Bell,
  Passcode: KeyRound,
  Paste: Clipboard,
  Photo: Image,
  Privacy: Lock,
  Profile: User,
  Settings: Settings,
  SignOut: LogOut,
  Terms: FileText,
  Upload: Upload,
} satisfies Record<string, Icon>

export type AppIconName = keyof typeof Icons
