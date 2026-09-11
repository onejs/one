import { pickerControls } from './pickerCatalog'
import { formControls } from './formCatalog'
import { leafControls } from './leafCatalog'
import { textControls } from './textCatalog'
import { presentationControls } from './presentationCatalog'
import type { Control } from './controlTypes'
export const controls: Control[] = [
  ...pickerControls,
  ...formControls,
  ...leafControls,
  ...textControls,
  ...presentationControls,
]
