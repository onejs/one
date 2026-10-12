import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// the generated fixture app needs a native notification source because
// simulator does not arbitrate audio sessions across processes.
const scenePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../ios/NativeFeatureTests/SceneDelegate.swift'
)
let scene = readFileSync(scenePath, 'utf8')
const marker = 'if url.scheme == "nativefeatures", url.host == "audio-interruption" {'
if (!scene.includes(marker)) {
  const importPoint = 'import ReactAppDependencyProvider\n'
  const openPoint = '    guard let url = URLContexts.first?.url else { return }\n'
  if (!scene.includes(importPoint) || !scene.includes(openPoint)) {
    throw new Error('generated SceneDelegate changed; update the audio interruption fixture hook')
  }
  scene = scene.replace(importPoint, `${importPoint}import AVFoundation\n`)
  scene = scene.replace(openPoint, `${openPoint}    ${marker}
      // simulator does not arbitrate audio sessions across processes, so the
      // conformance fixture posts the system notification into this process.
      let type: AVAudioSession.InterruptionType = url.path == "/ended" ? .ended : .began
      let options: AVAudioSession.InterruptionOptions = type == .ended ? [.shouldResume] : []
      NotificationCenter.default.post(
        name: AVAudioSession.interruptionNotification,
        object: AVAudioSession.sharedInstance(),
        userInfo: [
          AVAudioSessionInterruptionTypeKey: type.rawValue,
          AVAudioSessionInterruptionOptionKey: options.rawValue,
        ]
      )
      return
    }
`)
  writeFileSync(scenePath, scene)
}
