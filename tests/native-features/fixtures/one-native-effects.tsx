import { useRef, useState, type ComponentRef } from 'react'
import { PixelRatio, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const effects = ['mask', 'edge-mask', 'overlay', 'edge-blur', 'blur'] as const
const variants = ['canonical', 'bypass', 'wrong', 'zero', 'wrong-child'] as const
type Effect = (typeof effects)[number]
type Variant = (typeof variants)[number]
const custom = {
  type: 'stops' as const,
  values: [1, 1, 0, 0] as [number, number, ...number[]],
}
const linearBezier = { type: 'cubicBezier' as const, x1: 0, y1: 0, x2: 1, y2: 1 }

function Stripes({
  foreground = false,
  opacity = 1,
}: {
  foreground?: boolean
  opacity?: number
}) {
  return (
    <View style={[foreground ? styles.foreground : styles.fill, { opacity }]}>
      {Array.from({ length: foreground ? 10 : 60 }, (_, i) => (
        <View
          key={i}
          style={{
            // opaque stripe edges must align in the blurred and sharp references.
            height:
              PixelRatio.roundToNearestPixel((i + 1) * 4) -
              PixelRatio.roundToNearestPixel(i * 4),
            flexDirection: 'row',
          }}
        >
          <View style={{ flex: 1, backgroundColor: i % 2 ? '#808080' : '#000000' }} />
          <View style={{ flex: 1, backgroundColor: i % 2 ? '#ffffff' : '#808080' }} />
        </View>
      ))}
    </View>
  )
}

// each effect occupies the same measured stage. controls change the actual
// primitive while retaining content and labels, so pixels must distinguish it.
export default function OneNativeEffects() {
  const [effect, setEffect] = useState<Effect>('mask')
  const [variant, setVariant] = useState<Variant>('canonical')
  const [bounds, setBounds] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const stage = useRef<ComponentRef<typeof View>>(null)
  const curve = variant === 'wrong' ? 'linear' : custom
  const bypass = variant === 'bypass'
  const content = (
    <View
      style={[
        styles.fill,
        {
          backgroundColor:
            effect === 'mask'
              ? variant === 'zero'
                ? '#000000'
                : '#ff00ff'
              : variant === 'zero'
                ? '#000000'
                : '#ffffff',
        },
      ]}
    />
  )
  let subject
  if (effect === 'mask') {
    subject = bypass ? (
      content
    ) : (
      <One.UI.Mask
        style={styles.fill}
        maskElement={
          <View style={styles.fill}>
            <View style={[styles.maskHalf, { opacity: variant === 'wrong' ? 1 : 0.5 }]} />
            <View style={[styles.maskHalf, { top: 120 }]} />
          </View>
        }
      >
        {content}
      </One.UI.Mask>
    )
  } else if (effect === 'edge-mask' || effect === 'overlay') {
    subject = (
      <One.UI.EdgeFade
        mode={effect === 'overlay' ? 'overlay' : 'mask'}
        top={bypass ? 0 : 120}
        curve={curve}
        color={effect === 'overlay' ? '#000000' : undefined}
        style={styles.fill}
      >
        {content}
      </One.UI.EdgeFade>
    )
  } else if (effect === 'edge-blur') {
    subject =
      variant === 'wrong' ? (
        <View style={[styles.fill, { backgroundColor: '#808080' }]} />
      ) : bypass ? (
        <Stripes />
      ) : (
        <One.UI.EdgeFade
          mode="blur"
          bottom={120}
          blurRadius={variant === 'zero' ? 0 : 24}
          curve="linear"
          style={styles.fill}
        >
          <Stripes />
        </One.UI.EdgeFade>
      )
  } else {
    subject = (
      <>
        <Stripes />
        {variant === 'wrong' && (
          <View style={[styles.fill, { backgroundColor: '#808080' }]} />
        )}
        {!bypass && variant !== 'wrong' && (
          <One.UI.Blur
            intensity={variant === 'zero' ? 0 : 100}
            tint={Platform.OS === 'android' ? 'systemUltraThinMaterial' : 'light'}
            style={styles.fill}
          >
            <Stripes foreground opacity={variant === 'wrong-child' ? 0.5 : 1} />
          </One.UI.Blur>
        )}
        {bypass && <Stripes foreground />}
      </>
    )
  }
  const reading = {
    effect,
    variant,
    bounds,
    curves: {
      linear: One.UI.sampleCurve('linear'),
      smooth: One.UI.sampleCurve('smooth'),
      custom: One.UI.sampleCurve(custom),
      bezier: One.UI.sampleCurve(linearBezier),
      clamped: One.UI.sampleCurve({ type: 'stops', values: [2, 0.5, -1] }),
      presetSerialization: One.UI.serializeCurve('smooth'),
      wrongPresetSerialization: One.UI.serializeCurve('linear'),
      customSerialization: One.UI.serializeCurve(custom),
      bezierSerialization: One.UI.serializeCurve(linearBezier),
    },
  }
  return (
    <View style={styles.screen} testID="one-native-effects-mounted">
      <Text>Native effects</Text>
      <View style={styles.buttons}>
        {effects.map((name) => (
          <Pressable
            key={name}
            testID={`effect-${name}`}
            style={styles.button}
            onPress={() => {
              setEffect(name)
              setVariant('canonical')
            }}
          >
            <Text>{name}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.buttons}>
        {variants.map((name) => (
          <Pressable
            key={name}
            testID={`variant-${name}`}
            style={styles.button}
            onPress={() => setVariant(name)}
          >
            <Text>{name}</Text>
          </Pressable>
        ))}
      </View>
      <View
        ref={stage}
        collapsable={false}
        testID="effects-stage"
        style={styles.stage}
        onLayout={() =>
          stage.current?.measureInWindow((x, y, width, height) =>
            setBounds({ x, y, width, height })
          )
        }
      >
        {subject}
      </View>
      <Pressable testID="effects-reading" accessibilityLabel={JSON.stringify(reading)}>
        <Text>
          {effect}: {variant}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12, backgroundColor: '#dddddd' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { padding: 10, backgroundColor: '#ffffff' },
  stage: { width: 300, height: 240, backgroundColor: '#000000', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  maskHalf: {
    position: 'absolute',
    left: 60,
    top: 40,
    width: 180,
    height: 80,
    backgroundColor: '#00ff00',
  },
  foreground: { position: 'absolute', left: 40, top: 80, width: 40, height: 40 },
})
