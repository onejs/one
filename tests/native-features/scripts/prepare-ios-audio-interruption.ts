import { prepareIosSceneFixture } from './prepare-ios-scene'

// the generated fixture app needs a native notification source because
// simulator does not arbitrate audio sessions across processes.
const marker = 'if url.scheme == "nativefeatures", url.host == "audio-interruption" {'
prepareIosSceneFixture({
  marker,
  imports: ['AVFoundation'],
  handler: `      ${marker}
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
      }`,
})
