import { useState } from 'react'
import { One } from 'one'
import { Pressable, Text, View } from 'react-native'

// the fixture app ships no share extension or app group entitlement, so the
// simulator holds no share target container; the suite proves the native
// module is linked and its missing-container rejections surface stable codes.
const absentGroup = 'group.dev.one.share-target-absent'

export default function ShareTargetFixture() {
  const [drafts, setDrafts] = useState(-1)
  const [state, setState] = useState('idle')
  const [error, setError] = useState('-')
  const load = async () => {
    try {
      const found = await One.ShareTarget.getDrafts(absentGroup)
      setDrafts(found.length)
      setState('loaded')
    } catch (failure) {
      setError((failure as { code?: string }).code ?? String(failure))
      setState('rejected')
    }
  }
  const discard = async () => {
    try {
      await One.ShareTarget.discardDraft(absentGroup, 'missing-submission')
      setState('discarded')
    } catch (failure) {
      setError((failure as { code?: string }).code ?? String(failure))
      setState('rejected')
    }
  }
  return (
    <View testID="share-target-screen" style={{ padding: 24, gap: 20 }}>
      <Text testID="share-target-drafts">{`Drafts: ${drafts}`}</Text>
      <Text testID="share-target-state">{`State: ${state}`}</Text>
      <Text testID="share-target-error">{`Error: ${error}`}</Text>
      <Pressable testID="share-target-load" onPress={load}>
        <Text>Load drafts</Text>
      </Pressable>
      <Pressable testID="share-target-discard" onPress={discard}>
        <Text>Discard draft</Text>
      </Pressable>
    </View>
  )
}
