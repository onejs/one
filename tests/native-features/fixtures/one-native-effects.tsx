import { UI } from '@vxrn/native'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

// runtime proof for the native-effects track. mirrors Contrast Mobile's
// consumption 1:1: a BottomBlurBand-shaped progressive blur over a scrolling
// list, a masked fade band, a core-gradient overlay band, a tinted blur
// card, and an arbitrary-element mask. every section carries a mounted
// marker for Maestro plus negative controls (no-edge passthrough, zero
// radius/intensity, invalid mask) proving the primitives — not the content —
// draw the effect. readings travel as labels: RN Text testIDs vanish from
// the accessibility snapshot while Pressable IDs survive.
const ROWS = Array.from({ length: 24 }, (_, i) => i)

function Stripes({ testID }: { testID: string }) {
  return (
    <View testID={testID}>
      {ROWS.map((i) => (
        <View
          key={i}
          style={[styles.row, { backgroundColor: i % 2 === 0 ? '#111827' : '#f8fafc' }]}
        >
          <Text style={{ color: i % 2 === 0 ? '#f8fafc' : '#111827' }}>{`row ${i}`}</Text>
        </View>
      ))}
    </View>
  )
}

export default function OneNativeEffects() {
  const [band, setBand] = useState(true)
  return (
    <View style={styles.screen}>
      <Text testID="one-native-effects-mounted">Effects proof mounted</Text>

      {/* Contrast BottomBlurBand shape: scrolling content under a pinned
          progressive blur with live controls above it. */}
      <View style={styles.stage} testID="one-native-effects-stage">
        <ScrollView style={styles.fill}>
          <Stripes testID="one-native-effects-stripes" />
        </ScrollView>
        {band && (
          <UI.EdgeFade
            testID="one-native-effects-blur-band"
            mode="blur"
            bottom={140}
            blurRadius={24}
            curve="gentle"
            style={styles.band}
          >
            <View style={styles.bandContent}>
              <Text style={styles.bandText}>blur band live</Text>
              <Pressable
                testID="one-native-effects-band-toggle"
                style={styles.chip}
                onPress={() => setBand(false)}
              >
                <Text>Hide band</Text>
              </Pressable>
            </View>
          </UI.EdgeFade>
        )}
      </View>

      {/* progressive mask over stripes. */}
      <UI.EdgeFade testID="one-native-effects-mask" mode="mask" top={48} bottom={48}>
        <Stripes testID="one-native-effects-mask-stripes" />
      </UI.EdgeFade>

      {/* RN-core overlay gradient over a solid block (no native code). */}
      <UI.EdgeFade
        testID="one-native-effects-overlay"
        mode="overlay"
        top={64}
        color="#0f172a"
        style={styles.overlayBlock}
      >
        <Text style={styles.overlayText}>overlay over solid</Text>
      </UI.EdgeFade>

      {/* regular tinted blur with a sharp child on top. */}
      <View style={styles.blurStage}>
        <Stripes testID="one-native-effects-blur-stripes" />
        <UI.Blur
          testID="one-native-effects-blur"
          tint="systemChromeMaterial"
          intensity={60}
          style={styles.blurCard}
        >
          <Text style={styles.blurText}>sharp on blur</Text>
        </UI.Blur>
      </View>

      {/* arbitrary-element mask: content shows only inside the diamond. */}
      <UI.Mask
        testID="one-native-effects-mask-element"
        style={styles.arbitraryMask}
        maskElement={<View style={styles.diamond} />}
      >
        <Stripes testID="one-native-effects-arbitrary-stripes" />
      </UI.Mask>

      {/* negative controls: each must render identically to unstyled content. */}
      <Text>Negatives (must match plain content)</Text>
      <UI.EdgeFade testID="one-native-effects-negative-noedge">
        <Text>no edges enabled</Text>
      </UI.EdgeFade>
      <UI.EdgeFade testID="one-native-effects-negative-zero-blur" mode="blur" bottom={80} blurRadius={0}>
        <Text>zero blur radius</Text>
      </UI.EdgeFade>
      <UI.Blur testID="one-native-effects-negative-zero-intensity" intensity={0}>
        <Text>zero intensity</Text>
      </UI.Blur>
      <UI.Mask testID="one-native-effects-negative-invalid-mask">
        <Text>invalid mask element</Text>
      </UI.Mask>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  fill: { flex: 1 },
  stage: { height: 320, backgroundColor: '#ffffff' },
  row: { height: 44, justifyContent: 'center', paddingHorizontal: 12 },
  band: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 },
  bandContent: { flex: 1, justifyContent: 'flex-end', padding: 12, gap: 8 },
  bandText: { color: '#0f172a', fontWeight: '600' },
  chip: { backgroundColor: '#e2e8f0', padding: 8, borderRadius: 8, alignSelf: 'flex-start' },
  overlayBlock: { height: 120, backgroundColor: '#38bdf8', justifyContent: 'center', padding: 12 },
  overlayText: { color: '#ffffff', fontWeight: '600' },
  blurStage: { height: 160, overflow: 'hidden' },
  blurCard: { position: 'absolute', left: 24, right: 24, top: 40, height: 80, justifyContent: 'center', padding: 12 },
  blurText: { fontWeight: '700' },
  arbitraryMask: { height: 200, overflow: 'hidden' },
  diamond: { flex: 1, margin: 24, backgroundColor: '#000000', transform: [{ rotate: '45deg' }, { scale: 0.7 }] },
})
