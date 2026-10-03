import '@tamagui/native/setup-gesture-handler'
import '@tamagui/native/setup-keyboard-controller'
import '@tamagui/native/setup-teleport'
import '@tamagui/native/setup-safe-area'
import 'one'
import '~/features/storage/setupStorage'
import { registerNativeMenuAdapter } from '@tamagui/native'
import { createOneMenuAdapter } from '~/interface/ui/menu/oneMenuAdapter'

registerNativeMenuAdapter(createOneMenuAdapter())
