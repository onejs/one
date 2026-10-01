import { setupNativeSheet, type NativeSheetRendererProps } from '@tamagui/sheet'
import { Fragment, useMemo } from 'react'
import { Platform, View } from 'react-native'
import { Sheet } from './platform/Sheet.native'
import type { PresentationDetent } from './platform/generated/sheetTypes'

function TamaguiNativeSheetRenderer({
  open,
  onOpenChange,
  snapPoints,
  position,
  onPositionChange,
  onDismiss,
  children,
  ref,
  modal = false,
  disableDrag = false,
  dismissOnOverlayPress = true,
  containerComponent: ContentContainer = Fragment,
  portalProps,
  zIndex,
}: NativeSheetRendererProps) {
  const fitToContents = snapPoints.length === 1 && snapPoints[0].type === 'fit'
  const detents = useMemo(() => {
    if (fitToContents) return undefined
    return snapPoints.map((point): PresentationDetent => {
      if (point.type === 'fit') {
        throw new Error(
          'One native Sheet does not yet support fit combined with other snap points'
        )
      }
      if (point.value <= 0) {
        throw new Error('One native Sheet requires positive authored snap points')
      }
      return point.type === 'percent'
        ? { fraction: point.value / 100 }
        : { height: point.value }
    })
  }, [snapPoints, fitToContents])
  if (disableDrag === dismissOnOverlayPress) {
    throw new Error(
      'One native Sheet cannot control drag and backdrop dismissal independently'
    )
  }
  if (portalProps) {
    throw new Error(
      'One native Sheet uses the system presentation host, so portalProps are unavailable'
    )
  }
  const selectedDetent = detents?.[open ? position : 0]
  // interactiveDismissDisabled blocks closing, while a singleton also blocks resizing.
  const presentationDetents = useMemo(
    () => (disableDrag && selectedDetent ? [selectedDetent] : detents),
    [disableDrag, selectedDetent, detents]
  )
  return (
    <View ref={ref} style={{ position: 'absolute', width: 0, height: 0, zIndex }}>
      <Sheet
        isPresented={open}
        onIsPresentedChange={onOpenChange}
        onDidDismiss={onDismiss}
        fitToContents={fitToContents}
        presentationDetents={presentationDetents}
        selectedDetent={disableDrag ? undefined : selectedDetent}
        onSelectedDetentChange={
          detents && !disableDrag
            ? (detent) => {
                const index = detents.findIndex(
                  (point) =>
                    typeof point === 'object' &&
                    typeof detent === 'object' &&
                    (('fraction' in point &&
                      'fraction' in detent &&
                      point.fraction === detent.fraction) ||
                      ('height' in point &&
                        'height' in detent &&
                        point.height === detent.height))
                )
                if (index < 0)
                  throw new Error('One native Sheet selected an unauthored snap point')
                onPositionChange(index)
              }
            : undefined
        }
        interactiveDismissDisabled={disableDrag}
        presentationBackgroundInteraction={modal ? 'disabled' : 'enabled'}
      >
        <ContentContainer>{children}</ContentContainer>
      </Sheet>
    </View>
  )
}

export function setupTamaguiNativeSheet(): void {
  if (Platform.OS === 'ios') setupNativeSheet('ios', TamaguiNativeSheetRenderer)
}
