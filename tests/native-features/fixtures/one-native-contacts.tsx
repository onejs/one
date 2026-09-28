import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const code = (error: unknown) =>
  error && typeof error === 'object' && 'code' in error ? String(error.code) : String(error)

export default function OneNativeContacts() {
  const [permission, setPermission] = useState(One.iOS.Contacts.getPermissionStatus())
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState('none')
  const [addressResult, setAddressResult] = useState('none')
  const [pickerStage, setPickerStage] = useState('idle')
  const [pickerResult, setPickerResult] = useState('none')

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
      for (const name of ['OneProof', 'OneEdited']) {
        for (const contact of await One.iOS.Contacts.search(name, 100)) {
          if (contact.familyName === 'NativeContacts27') {
            await One.iOS.Contacts.delete(contact.identifier)
          }
        }
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
        postalAddresses: [{ label: 'Proof office', street: '1 Market Street', city: 'San Francisco', state: 'CA', postalCode: '94105', country: 'United States', isoCountryCode: 'US' }],
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
      const addressCreated = found?.postalAddresses.length === 1 &&
        found.postalAddresses[0].label === 'Proof office' &&
        found.postalAddresses[0].street === '1 Market Street' &&
        found.postalAddresses[0].city === 'San Francisco' &&
        found.postalAddresses[0].isoCountryCode === 'US'
      stage = 'edit'
      const changed = await One.iOS.Contacts.update(identifier, {
        givenName: 'OneEdited',
        phoneNumbers: ['+1 415 555 0110'],
        emailAddresses: ['one-edited@example.test'],
        postalAddresses: [{ label: 'Proof office', street: '2 Market Street', city: 'San Francisco', state: 'CA', postalCode: '94105', country: 'United States', isoCountryCode: 'US' }],
      })
      const afterEdit = await One.iOS.Contacts.search('OneEdited', 20)
      const addressEdited = changed.postalAddresses.length === 1 &&
        changed.postalAddresses[0].label === 'Proof office' &&
        changed.postalAddresses[0].street === '2 Market Street' &&
        afterEdit.some((contact) => contact.identifier === identifier &&
          contact.postalAddresses[0]?.street === '2 Market Street')
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
      const afterPartial = await One.iOS.Contacts.search('OneEdited', 20)
      const addressPreserved = cleared.postalAddresses[0]?.street === '2 Market Street' &&
        cleared.postalAddresses[0]?.label === 'Proof office' &&
        afterPartial.some((contact) => contact.identifier === identifier &&
          contact.postalAddresses[0]?.street === '2 Market Street' &&
          contact.postalAddresses[0]?.label === 'Proof office')
      const partial = cleared.identifier === identifier &&
        cleared.givenName === 'OneEdited' &&
        cleared.familyName === 'NativeContacts27' &&
        cleared.phoneNumbers.includes('+1 415 555 0110') &&
        cleared.emailAddresses.length === 0 &&
        afterPartial.some(
          (contact) => contact.identifier === identifier && contact.emailAddresses.length === 0
        )
      stage = 'picker selection'
      setPickerStage('selecting')
      const picked = await One.iOS.Contacts.pickContact()
      const selected = picked?.identifier === identifier &&
        picked.givenName === 'OneEdited' &&
        picked.phoneNumbers.includes('+1 415 555 0110') &&
        picked.postalAddresses[0]?.street === '2 Market Street'
      stage = 'picker swipe dismissal'
      setPickerStage('swiping')
      const swiped = await One.iOS.Contacts.pickContact() === undefined
      stage = 'picker after swipe'
      setPickerStage('afterSwipe')
      const afterSwipe = await One.iOS.Contacts.pickContact() === undefined
      setPickerStage('done')
      const invalid = await One.iOS.Contacts.search('OneProof', 0).then(
        () => 'unexpected',
        code
      )
      const invalidUpdate = await One.iOS.Contacts.update(identifier, {}).then(
        () => 'unexpected',
        code
      )
      const invalidAddress = await One.iOS.Contacts.update(identifier, {
        postalAddresses: [{}],
      }).then(() => 'unexpected', code)
      const clearAddressResult = await One.iOS.Contacts.update(identifier, {
        postalAddresses: [],
      })
      const addressCleared = clearAddressResult.postalAddresses.length === 0 &&
        (await One.iOS.Contacts.search('OneEdited', 20)).some(
          (contact) => contact.identifier === identifier && contact.postalAddresses.length === 0
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
      setAddressResult(`created=${addressCreated}; edited=${addressEdited}; preserved=${addressPreserved}; cleared=${addressCleared}; invalid=${invalidAddress}`)
      setPickerResult(`selected=${selected}; swiped=${swiped}; afterSwipe=${afterSwipe}`)
      setResult(`before=${before}; blankCreate=${blankCreate}; matched=${matched}; edited=${edited}; partial=${partial}; removed=${removed}; missingDelete=${missingDelete}; notFound=${notFound}; invalidUpdate=${invalidUpdate}; invalid=${invalid}`)
      setStatus(before === 'E_CONTACTS_PERMISSION' && blankCreate === 'E_CONTACTS_INPUT' &&
        matched && edited && partial && removed && missingDelete === 'E_CONTACTS_NOT_FOUND' &&
        notFound === 'E_CONTACTS_NOT_FOUND' && invalidUpdate === 'E_CONTACTS_INPUT' &&
        invalid === 'E_CONTACTS_INPUT' && addressCreated && addressEdited &&
        addressPreserved && addressCleared && invalidAddress === 'E_CONTACTS_INPUT' &&
        selected && swiped && afterSwipe ? 'passed' : 'failed')
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
      <Text>{`Address: ${addressResult}`}</Text>
      <Text>{`Picker stage: ${pickerStage}`}</Text>
      <Text>{`Picker: ${pickerResult}`}</Text>
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
