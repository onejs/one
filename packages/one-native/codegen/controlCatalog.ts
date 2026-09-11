import { pickerControls } from './pickerCatalog'
import { formControls } from './formCatalog'
import type { Control } from './controlTypes'
export const controls: Control[] = [...pickerControls, ...formControls]
