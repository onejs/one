import { pickerControls } from './pickerCatalog'
import { formControls } from './formCatalog'
import { leafControls } from './leafCatalog'
import { mapControls } from './mapCatalog'
import { mediaControls } from './mediaCatalog'
import { shapeControls } from './shapeCatalog'
import { textControls } from './textCatalog'
import { presentationControls } from './presentationCatalog'
import type { Control } from './controlTypes'
export const controls: Control[] = [
  ...pickerControls,
  ...formControls,
  ...leafControls,
  ...shapeControls,
  ...mediaControls,
  ...mapControls,
  ...textControls,
  ...presentationControls,
]
