import { Fonts, useFonts } from '@vxrn/native'
import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

// exercises runtime font loading: the TestFont's A is a solid block no
// system font has, so the sample below proves by pixels that the PostScript
// name resolves after load. readings travel as labels because RN Text
// testIDs vanish from the accessibility snapshot while Pressable IDs
// survive. the hook sample loads its own BlockB font so its mount effect
// cannot race the manual load's false-before assertion. the negative
// control loads the same file under a wrong key:
// iOS rejects (the name never becomes usable), Android registers silently
// because Typeface exposes no name query, so each platform's suite asserts
// its own outcome.
const FONT_NAME = 'OneNativeTestFont-Regular'
const WRONG_KEY = 'OneNativeTestFont-Nope'
const HOOK_FONT_NAME = 'OneNativeTestFont-BlockB'

const fontAsset = require('../assets/OneNativeTestFont-Regular.ttf')
const hookFontAsset = require('../assets/OneNativeTestFont-BlockB.ttf')

const fontMap = { [FONT_NAME]: fontAsset }
const hookFontMap = { [HOOK_FONT_NAME]: hookFontAsset }

function HookSample() {
  const [loaded, error] = useFonts(hookFontMap)
  return (
    <View>
      <Text>{`Hook: ${error ? 'error' : loaded ? 'loaded' : 'loading'}`}</Text>
      {loaded ? <Text style={[styles.sample, { fontFamily: HOOK_FONT_NAME }]}>B</Text> : null}
    </View>
  )
}

export default function OneNativeFonts() {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [negative, setNegative] = useState('idle')
  const [negativeError, setNegativeError] = useState('')
  const loaded = Fonts.isLoaded(FONT_NAME)

  async function onLoad() {
    setStatus('loading')
    setError('')
    try {
      await Fonts.load(fontMap)
      setStatus('loaded')
    } catch (unknown) {
      setStatus('error')
      setError(unknown instanceof Error ? unknown.message : String(unknown))
    }
  }

  async function onNegative() {
    setNegative('loading')
    setNegativeError('')
    try {
      await Fonts.load({ [WRONG_KEY]: fontAsset })
      setNegative('resolved')
    } catch (unknown) {
      setNegative('rejected')
      setNegativeError(unknown instanceof Error ? unknown.message : String(unknown))
    }
  }

  return (
    <View style={styles.screen}>
      <Text>{`Loaded: ${loaded}`}</Text>
      <Text>{`Status: ${status}`}</Text>
      {error ? <Text>{`Error: ${error}`}</Text> : null}
      <Text>{`Uri: ${Image.resolveAssetSource(fontAsset)?.uri ?? 'null'}`}</Text>
      <Text style={[styles.sample, loaded ? { fontFamily: FONT_NAME } : null]}>A</Text>
      <Pressable testID="one-native-fonts-load" style={styles.chip} onPress={onLoad}>
        <Text>Load font</Text>
      </Pressable>
      <HookSample />
      <Text>{`Negative: ${negative}`}</Text>
      <Text>{`NegativeLoaded: ${Fonts.isLoaded(WRONG_KEY)}`}</Text>
      {negativeError ? <Text>{`NegativeError: ${negativeError}`}</Text> : null}
      <Pressable
        testID="one-native-fonts-negative"
        style={styles.chip}
        onPress={onNegative}
      >
        <Text>Load wrong key</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
  sample: { fontSize: 72 },
})
