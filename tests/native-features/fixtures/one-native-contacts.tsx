import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const code = (error: unknown) =>
  error && typeof error === 'object' && 'code' in error ? String(error.code) : String(error)

export default function OneNativeContacts() {
  const [permission, setPermission] = useState(One.iOS.Contacts.getPermissionStatus())
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState('none')

  const run = async () => {
    setStatus('running')
    let identifier = ''
    let stage = 'permission'
    try {
      const before = await One.iOS.Contacts.search('OneProof', 10).then(
        () => 'unexpected',
        code
      )
      const granted = await One.iOS.Contacts.requestPermission()
      setPermission(granted)
      if (granted !== 'authorized' && granted !== 'limited') {
        throw new Error(`Permission: ${granted}`)
      }
      const blankCreate = await One.iOS.Contacts.create({
        givenName: 'Invalid',
        familyName: '',
        phoneNumbers: [' '],
        emailAddresses: [],
      }).then(() => 'unexpected', code)
      stage = 'create'
      identifier = await One.iOS.Contacts.create({
        givenName: 'OneProof',
        familyName: 'NativeContacts27',
        phoneNumbers: ['+1 415 555 0109'],
        emailAddresses: ['one-proof@example.test'],
      })
      stage = 'search'
      const matches = await One.iOS.Contacts.search('OneProof', 20)
      const found = matches.find((contact) => contact.identifier === identifier)
      const matched = Boolean(
        identifier &&
          found?.givenName === 'OneProof' &&
          found.familyName === 'NativeContacts27' &&
          found.phoneNumbers.includes('+1 415 555 0109') &&
          found.emailAddresses.includes('one-proof@example.test')
      )
      stage = 'edit'
      const changed = await One.iOS.Contacts.update(identifier, {
        givenName: 'OneEdited',
        phoneNumbers: ['+1 415 555 0110'],
        emailAddresses: ['one-edited@example.test'],
      })
      const afterEdit = await One.iOS.Contacts.search('OneEdited', 20)
      const edited = changed.identifier === identifier &&
        changed.givenName === 'OneEdited' &&
        changed.familyName === 'NativeContacts27' &&
        changed.phoneNumbers.includes('+1 415 555 0110') &&
        changed.emailAddresses.includes('one-edited@example.test') &&
        afterEdit.some((contact) => contact.identifier === identifier &&
          contact.givenName === 'OneEdited' &&
          contact.phoneNumbers.includes('+1 415 555 0110')) &&
        !(await One.iOS.Contacts.search('OneProof', 20)).some(
          (contact) => contact.identifier === identifier
        )
      const cleared = await One.iOS.Contacts.update(identifier, { emailAddresses: [] })
      const partial = cleared.identifier === identifier &&
        cleared.givenName === 'OneEdited' &&
        cleared.familyName === 'NativeContacts27' &&
        cleared.phoneNumbers.includes('+1 415 555 0110') &&
        cleared.emailAddresses.length === 0 &&
        (await One.iOS.Contacts.search('OneEdited', 20)).some(
          (contact) => contact.identifier === identifier && contact.emailAddresses.length === 0
        )
      const invalid = await One.iOS.Contacts.search('OneProof', 0).then(
        () => 'unexpected',
        code
      )
      const invalidUpdate = await One.iOS.Contacts.update(identifier, {}).then(
        () => 'unexpected',
        code
      )
      stage = 'delete'
      await One.iOS.Contacts.delete(identifier)
      stage = 'verify delete'
      const after = await One.iOS.Contacts.search('OneEdited', 20)
      const removed = !after.some((contact) => contact.identifier === identifier)
      const missingDelete = await One.iOS.Contacts.delete(identifier).then(
        () => 'unexpected',
        code
      )
      const notFound = await One.iOS.Contacts.update(identifier, { givenName: 'Gone' }).then(
        () => 'unexpected',
        code
      )
      identifier = ''
      setResult(`before=${before}; blankCreate=${blankCreate}; matched=${matched}; edited=${edited}; partial=${partial}; removed=${removed}; missingDelete=${missingDelete}; notFound=${notFound}; invalidUpdate=${invalidUpdate}; invalid=${invalid}`)
      setStatus(before === 'E_CONTACTS_PERMISSION' && blankCreate === 'E_CONTACTS_INPUT' &&
        matched && edited && partial && removed && missingDelete === 'E_CONTACTS_NOT_FOUND' &&
        notFound === 'E_CONTACTS_NOT_FOUND' && invalidUpdate === 'E_CONTACTS_INPUT' &&
        invalid === 'E_CONTACTS_INPUT' ? 'passed' : 'failed')
    } catch (error) {
      setResult(`${stage}: ${code(error)}`)
      setStatus('failed')
    } finally {
      if (identifier) await One.iOS.Contacts.delete(identifier).catch(() => undefined)
    }
  }

  return (
    <View style={styles.screen}>
      <Text>{`Permission: ${permission}`}</Text>
      <Text>{`Status: ${status}`}</Text>
      <Text>{`Result: ${result}`}</Text>
      <Pressable testID="one-native-contacts-run" style={styles.button} onPress={run}>
        <Text>Run Contacts proof</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  button: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
