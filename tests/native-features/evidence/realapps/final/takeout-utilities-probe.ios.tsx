import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import { RNIUtilitiesModule } from 'react-native-ios-utilities'
export default function UtilitiesProbe() {
  const [result, setResult] = useState('RNIUtilities probe pending')
  useEffect(() => {
    try {
      RNIUtilitiesModule.setModuleSharedValue('one-realapps', 'round-trip', 'a4-runtime')
      const actual = RNIUtilitiesModule.getModuleSharedValue('one-realapps', 'round-trip')
      if (actual !== 'a4-runtime') throw new Error(`round trip returned ${JSON.stringify(actual)}`)
      RNIUtilitiesModule.overwriteModuleSharedValues('one-realapps', {})
      setResult('RNIUtilities JSI round trip passed')
    } catch (error) { setResult(`RNIUtilities JSI failed: ${String(error)}`) }
  }, [])
  return <Text testID="realapps-utilities-result">{result}</Text>
}
