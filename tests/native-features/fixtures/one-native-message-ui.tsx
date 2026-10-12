import { useState } from 'react'
import { One } from 'one'
import { Pressable, Text, View } from 'react-native'

export default function MessageUIFixture() {
  const [capabilities] = useState(() => ({
    mail: One.iOS.MFMailComposeViewController.canSendMail(),
    text: One.iOS.MFMessageComposeViewController.canSendText(),
  }))
  const [result, setResult] = useState('idle')
  const [error, setError] = useState('-')
  const present = async (kind: 'mail' | 'text') => {
    try {
      if (kind === 'mail') {
        const controller = new One.iOS.MFMailComposeViewController()
        controller.mailComposeDelegate = {
          mailComposeController: (sender, response) => {
            setResult(response.didFinishWith)
            void sender.dismiss()
          },
        }
        await controller.present()
      } else {
        const controller = new One.iOS.MFMessageComposeViewController()
        controller.body = 'MessageUI fixture'
        controller.messageComposeDelegate = {
          messageComposeViewController: (sender, response) => {
            setResult(response.didFinishWith)
            void sender.dismiss()
          },
        }
        await controller.present()
      }
      setResult('presented')
    } catch (failure) {
      setError((failure as { code?: string }).code ?? String(failure))
      setResult('rejected')
    }
  }
  return (
    <View testID="message-ui-screen" style={{ padding: 24, gap: 20 }}>
      <Text testID="message-ui-mail-supported">{`Mail: ${capabilities.mail}`}</Text>
      <Text testID="message-ui-text-supported">{`Text: ${capabilities.text}`}</Text>
      <Text testID="message-ui-result">{`Result: ${result}`}</Text>
      <Text testID="message-ui-error">{`Error: ${error}`}</Text>
      <Pressable testID="message-ui-mail" onPress={() => present('mail')}>
        <Text>Compose mail</Text>
      </Pressable>
      <Pressable testID="message-ui-text" onPress={() => present('text')}>
        <Text>Compose message</Text>
      </Pressable>
    </View>
  )
}
