import { useState } from 'react'
import { Swift } from '@vxrn/native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

const categories = ['SignIn', 'Files'] as const

// fixed so the request is identical on every run; the consumer passes a fresh uuid.
const nonce = 'one-native-fixture-nonce'
const requestedScopes: ('fullName' | 'email')[] = ['fullName', 'email']
const allowedContentTypes: string[] = ['public.text']

export default function OneNativeAppleFile() {
  const [category, setCategory] = useState<(typeof categories)[number]>('SignIn')
  // sign in state: one completion carries the credential or the failure message.
  const [signInCompletions, setSignInCompletions] = useState(0)
  const [user, setUser] = useState('none')
  const [email, setEmail] = useState('none')
  const [givenName, setGivenName] = useState('none')
  const [familyName, setFamilyName] = useState('none')
  const [token, setToken] = useState('no')
  const [signInMessage, setSignInMessage] = useState('none')
  // file import state: one completion per picked file, plus the binding round-trip.
  const [isPresented, setIsPresented] = useState(false)
  const [changes, setChanges] = useState(0)
  const [fileCompletions, setFileCompletions] = useState(0)
  const [url, setUrl] = useState('none')
  const [index, setIndex] = useState('none')
  const [count, setCount] = useState('none')
  const [fileMessage, setFileMessage] = useState('none')

  const handleSignInCompletion = (
    nextUser: string,
    nextEmail: string,
    nextGivenName: string,
    nextFamilyName: string,
    identityToken: string,
    _authorizationCode: string,
    message: string
  ) => {
    setSignInCompletions((total) => total + 1)
    setUser(nextUser || 'none')
    setEmail(nextEmail || 'none')
    setGivenName(nextGivenName || 'none')
    setFamilyName(nextFamilyName || 'none')
    setToken(identityToken ? 'yes' : 'no')
    setSignInMessage(message || 'none')
  }
  const handlePresentationChange = (value: boolean) => {
    setChanges((total) => total + 1)
    setIsPresented(value)
  }
  const handleFileCompletion = (
    nextUrl: string,
    nextIndex: number,
    nextCount: number,
    message: string
  ) => {
    setFileCompletions((total) => total + 1)
    setUrl(nextUrl || 'none')
    setIndex(String(nextIndex))
    setCount(String(nextCount))
    setFileMessage(message || 'none')
  }
  const status: [string, string | number][] =
    category === 'SignIn'
      ? [
          ['Category', category],
          ['Completions', signInCompletions],
          ['User', user],
          ['Email', email],
          ['Given', givenName],
          ['Family', familyName],
          ['Token', token],
          ['Message', signInMessage],
        ]
      : [
          ['Category', category],
          ['Presented', String(isPresented)],
          ['Changes', changes],
          ['Completions', fileCompletions],
          ['Url', url],
          ['Index', index],
          ['Count', count],
          ['Message', fileMessage],
        ]

  return (
    <View style={styles.screen} testID="one-native-apple-file-screen">
      <View style={styles.row}>
        {categories.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: category === item }}
            key={item}
            style={[styles.action, category === item && styles.selected]}
            testID={`one-native-apple-file-category-${item.toLowerCase()}`}
            onPress={() => {
              setCategory(item)
              setSignInCompletions(0)
              setUser('none')
              setEmail('none')
              setGivenName('none')
              setFamilyName('none')
              setToken('no')
              setSignInMessage('none')
              setIsPresented(false)
              setChanges(0)
              setFileCompletions(0)
              setUrl('none')
              setIndex('none')
              setCount('none')
              setFileMessage('none')
            }}
          >
            <Text style={styles.actionText}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.status}>
        {status.map(([label, value]) => (
          <Text
            key={label}
            style={styles.statusText}
            testID={`one-native-apple-file-status-${label.toLowerCase().replace(' ', '-')}`}
          >{`${label}: ${value}`}</Text>
        ))}
      </View>
      {category === 'SignIn' ? (
        <View style={styles.nativeArea}>
          <Swift.SignInWithAppleButton
            requestedScopes={requestedScopes}
            nonce={nonce}
            onCompletion={handleSignInCompletion}
            style={styles.nativeControl}
            testID="one-native-apple-file-signin"
          />
        </View>
      ) : (
        <>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-apple-file-open"
              onPress={() => handlePresentationChange(true)}
            >
              <Text style={styles.actionText}>Open importer</Text>
            </Pressable>
          </View>
          <Swift.FileImporter
            isPresented={isPresented}
            allowedContentTypes={allowedContentTypes}
            allowsMultipleSelection={false}
            onIsPresentedChange={handlePresentationChange}
            onCompletion={handleFileCompletion}
            testID="one-native-apple-file-importer"
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 10, paddingTop: 8, backgroundColor: '#F5F5F7' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  actions: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  action: {
    minHeight: 34,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#E3E3E8',
  },
  selected: { backgroundColor: '#B7D5FF' },
  actionText: { color: '#17233A', fontSize: 12, fontWeight: '600' },
  status: { marginTop: 6, padding: 6, borderRadius: 8, backgroundColor: '#FFFFFF' },
  statusText: { color: '#17233A', fontSize: 11, fontVariant: ['tabular-nums'] },
  // the button is measured: SwiftUI reports its ideal height and Yoga sizes the row.
  nativeArea: { marginTop: 8, justifyContent: 'center' },
  nativeControl: { width: '100%' },
})
