import { View } from 'react-native'

// web has no swift or kotlin: the same api in typescript. ios and android
// resolve device.ios.tsx and device.android.ts instead.
export const Device = {
  async info(): Promise<Record<string, string>> {
    return { language: 'TypeScript', model: 'Browser', system: 'Web' }
  },
  async sha256(text: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  },
}

export type LevelProps = { value: number; onChange: (value: number) => void }

export function Level({ value }: LevelProps) {
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: '#eee' }}>
      <View
        style={{
          height: 8,
          borderRadius: 4,
          width: `${value * 100}%`,
          backgroundColor: 'orange',
        }}
      />
    </View>
  )
}
