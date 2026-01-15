import { View, Text } from 'react-native'

export default function ImportMetaEnv() {
  return (
    <View style={{ paddingVertical: 80 }}>
      <Text>JSON.stringify(import.meta.env):</Text>
      <Text testID="import-meta-env-value-json">{JSON.stringify(import.meta.env)}</Text>

      <Text>import.meta.env.VITE_TEST_ENV_VAR_1:</Text>
      <Text testID="import-meta-env-VITE_TEST_ENV_VAR_1-value">
        {import.meta.env.VITE_TEST_ENV_VAR_1}
      </Text>

      <Text>import.meta.env['VITE_TEST_ENV_VAR_1']:</Text>
      <Text testID="import-meta-env-VITE_TEST_ENV_VAR_1-value-2">
        {import.meta.env['VITE_TEST_ENV_VAR_1']}
      </Text>

      <Text>import.meta.env.VITE_TEST_ENV_MODE:</Text>
      <Text testID="import-meta-env-VITE_TEST_ENV_MODE">
        {import.meta.env.VITE_TEST_ENV_MODE}
      </Text>

      <Text>import.meta.env.VITE_ENVIRONMENT:</Text>
      <Text testID="import-meta-env-VITE_ENVIRONMENT">
        {import.meta.env.VITE_ENVIRONMENT}
      </Text>

      <Text>import.meta.env.VITE_PLATFORM:</Text>
      <Text testID="import-meta-env-VITE_PLATFORM">{import.meta.env.VITE_PLATFORM}</Text>

      <Text>import.meta.env.EXPO_OS:</Text>
      <Text testID="import-meta-env-EXPO_OS">{import.meta.env.EXPO_OS}</Text>
    </View>
  )
}
