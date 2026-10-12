import { useRef, useState } from 'react'
import { One } from 'one'
import { Pressable, Text, View } from 'react-native'

export default function DocumentCameraFixture() {
  const camera = useRef<InstanceType<
    typeof One.iOS.VNDocumentCameraViewController
  > | null>(null)
  const [supported] = useState(() => One.iOS.VNDocumentCameraViewController.isSupported)
  const [state, setState] = useState('idle')
  const [pages, setPages] = useState(0)
  const [error, setError] = useState('-')
  const present = async () => {
    const controller = (camera.current ??= new One.iOS.VNDocumentCameraViewController())
    controller.delegate = {
      documentCameraViewController: (sender, result) => {
        if ('didFinishWith' in result) {
          setPages(result.didFinishWith.pageCount)
          setState('finished')
        } else {
          setError(`${result.didFailWith.domain}:${result.didFailWith.code}`)
          setState('failed')
        }
        void sender.dismiss()
      },
      documentCameraViewControllerDidCancel: (sender) => {
        setState('canceled')
        void sender.dismiss()
      },
    }
    try {
      await controller.present()
      setState('presented')
    } catch (failure) {
      setError((failure as { code?: string }).code ?? String(failure))
      setState('rejected')
    }
  }
  return (
    <View testID="document-camera-screen" style={{ padding: 24, gap: 20 }}>
      <Text testID="document-camera-supported">{`Supported: ${supported}`}</Text>
      <Text testID="document-camera-state">{`State: ${state}`}</Text>
      <Text testID="document-camera-pages">{`Pages: ${pages}`}</Text>
      <Text testID="document-camera-error">{`Error: ${error}`}</Text>
      <Pressable testID="document-camera-present" onPress={present}>
        <Text>Scan documents</Text>
      </Pressable>
    </View>
  )
}
