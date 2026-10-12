import { Children, isValidElement, type ReactElement } from 'react'
import {
  Map as GeneratedMap,
  MapCompass,
  MapPitchToggle,
  MapUserLocationButton,
} from './generated/Controls.native'
import { assertOneNativeChildren } from './containerChildren'
import type { MapWithControlsProps } from './mapControls'

// a map control operates on the map it is composed into, so the adapter keeps
// anything else out with a javascript stack before Fabric ever mounts it. the
// native insertChild preconditions as the backstop.
const accepted =
  'One.iOS.MapCompass, One.iOS.MapPitchToggle, or One.iOS.MapUserLocationButton'

export function Map({ children, ...props }: MapWithControlsProps): ReactElement {
  if (children !== undefined) {
    assertOneNativeChildren(children, 'One.iOS.Map')
    for (const child of Children.toArray(children)) {
      if (child === null || child === undefined || typeof child === 'boolean') continue
      if (
        !isValidElement(child) ||
        (child.type !== MapCompass &&
          child.type !== MapPitchToggle &&
          child.type !== MapUserLocationButton)
      )
        throw new Error(`One.iOS.Map accepts ${accepted} elements as direct children`)
    }
  }
  // the generated adapter forwards the rest props, children included, to the
  // native view; the cast only widens its props to name the slot.
  const NativeMap = GeneratedMap as (props: MapWithControlsProps) => ReactElement
  return <NativeMap {...props}>{children}</NativeMap>
}
