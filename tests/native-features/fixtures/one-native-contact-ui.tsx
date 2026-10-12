import { useRef, useState } from 'react'
import { One } from 'one'
import { Pressable, Text, View } from 'react-native'

export default function ContactUIFixture() {
  const active = useRef<InstanceType<typeof One.iOS.CNContactViewController> | null>(null)
  const saved = useRef<{ readonly identifier: string } | null>(null)
  const [draft] = useState(() => {
    const value = new One.iOS.CNMutableContact()
    value.givenName = 'UIKit'
    value.familyName = 'Fixture'
    return value
  })
  const [store] = useState(() => new One.iOS.CNContactStore())
  const [result, setResult] = useState('idle')
  const [error, setError] = useState('-')
  const present = async (mode: 'new' | 'unknown' | 'known') => {
    try {
      let controller: InstanceType<typeof One.iOS.CNContactViewController>
      if (mode === 'known') {
        if (!saved.current) throw new Error('Save a contact first')
        await One.Contacts.requestPermission()
        const contact = await store.unifiedContact({
          withIdentifier: saved.current.identifier,
          keysToFetch: [One.iOS.CNContactViewController.descriptorForRequiredKeys()],
        })
        controller = new One.iOS.CNContactViewController({ forContact: contact })
      } else
        controller = new One.iOS.CNContactViewController(
          mode === 'new' ? { forNewContact: draft } : { forUnknownContact: draft }
        )
      active.current = controller
      controller.contactStore = store
      controller.delegate = {
        contactViewController: (sender, response) => {
          if (response.didCompleteWith)
            saved.current = response.didCompleteWith
          setResult(response.didCompleteWith ? 'saved' : 'cancelled')
          void sender.dismiss()
        },
      }
      await controller.present()
      setResult('presented')
    } catch (failure) {
      setError((failure as { code?: string }).code ?? String(failure))
      setResult('rejected')
    }
  }
  return (
    <View testID="contact-ui-screen" style={{ padding: 24, gap: 20 }}>
      <Text testID="contact-ui-draft">{`Draft: ${draft.givenName} ${draft.familyName}`}</Text>
      <Text testID="contact-ui-result">{`Result: ${result}`}</Text>
      <Text testID="contact-ui-error">{`Error: ${error}`}</Text>
      <Pressable testID="contact-ui-new" onPress={() => present('new')}>
        <Text>Create contact</Text>
      </Pressable>
      <Pressable testID="contact-ui-unknown" onPress={() => present('unknown')}>
        <Text>Show unknown contact</Text>
      </Pressable>
      <Pressable testID="contact-ui-known" onPress={() => present('known')}>
        <Text>Show saved contact</Text>
      </Pressable>
      <Pressable
        testID="contact-ui-dismiss"
        onPress={() => {
          void active.current?.dismiss()
          setResult('dismissed')
        }}
      >
        <Text>Dismiss contact</Text>
      </Pressable>
    </View>
  )
}
