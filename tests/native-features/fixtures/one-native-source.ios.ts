import { AudioMath } from '../native-source/Audio.swift'

export async function runNativeSource(): Promise<string> {
  const rms = await AudioMath.rms([3, 4])
  const label = await AudioMath.label('hello')
  return JSON.stringify({ rms, label })
}
