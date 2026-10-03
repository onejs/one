import { One, useSafeAreaInsets } from 'one'
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
// the insets come from the provider One mounts at its root: this package
// resolves to One's copy unless the app declares its own.
import type { FormSheetBodyProps, FormSheetFrameProps } from './formContract'

// the ios leg: the body of a route presented as a `formSheet` whose screen is
// transparent, so the system material fills the sheet and what sits under it
// (the dashboard, the map) shows through. on web the route sheet's container is
// the frame instead (FormSheetBodyImpl.tsx); on android the frame is the
// Tamagui sheet the transparent modal route presents
// (FormSheetBodyImpl.android.tsx).
//
// the frame is sized to the largest detent rather than flexing, because the
// sheet's content wrapper has no bottom edge: a flex body would collapse, and
// a fixed one takes the largest detent's height and clips at the screen edge
// at the smaller one. the detent fraction resolves against maximumDetentValue,
// which is the window minus the window-level top safe area, not the window:
// sizing from the window overshoots and pushes the action below the fold.
// the frame reads the app root's provider, whose insets are the window's even
// inside the sheet, so the top inset it subtracts is the window's and follows
// a rotation or an unfold. UIKit gives a view only the part of the window safe
// area its frame overlaps, which is what a provider measures for its own view,
// so the one nested here holds the sheet's insets and the frame pads its sides
// by them: a card beside the landscape status bar clears it, and a column
// clear of it keeps its full width. content inside reads those insets too.
// `paddingBottom` is for a body that scrolls itself (a screen Form) and so
// needs the home indicator clearance on the frame; a body that scrolls here
// gets it in the content inset instead.
export function FormSheetFrame({
  children,
  paddingBottom,
  fill,
  glass,
}: FormSheetFrameProps) {
  const { height } = useWindowDimensions()
  const { top } = useSafeAreaInsets()

  return (
    <View
      style={
        fill
          ? { flex: 1, paddingBottom, overflow: 'hidden' }
          : {
              height: Math.round((height - top) * 0.92),
              paddingBottom,
              overflow: 'hidden',
            }
      }
    >
      {glass ? null : (
        <One.UI.Blur
          intensity={100}
          tint="systemMaterial"
          style={StyleSheet.absoluteFill}
        />
      )}
      <One.UI.SafeArea.Provider>
        <One.UI.SafeArea.View edges={['left', 'right']} style={{ flex: 1 }}>
          {children}
        </One.UI.SafeArea.View>
      </One.UI.SafeArea.Provider>
    </View>
  )
}

// the frame with a scrolling column inside it, for a sheet whose content is a
// stack of blocks above and around a `<Form presentation="sheet">`. warning:
// the native Form measures zero height inside a scroll view and paints
// nothing, so any Form child of this body is blank until One implements
// content sizing for it. a sheet whose body is only a Form belongs in a frame
// that renders it directly (the template's SheetScreen does this).
export function FormSheetBody({ children }: FormSheetBodyProps) {
  const insets = useSafeAreaInsets()
  return (
    <FormSheetFrame>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: insets.bottom + 12,
          paddingHorizontal: 16,
          gap: 16,
        }}
      >
        {children}
      </ScrollView>
    </FormSheetFrame>
  )
}
