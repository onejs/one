import { createEmitter } from '@vxrn/emitter'

type ID = string

export const messageHover = createEmitter<ID>()
export const messageActionBarStickOpen = createEmitter<boolean>()
