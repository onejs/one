import type { Control } from './controlTypes'

// controls that come from SwiftUI's overlay modules rather than SwiftUI itself. VideoPlayer
// lives in _AVKit_SwiftUI, which the generator reads alongside every other _*_SwiftUI module.
export const mediaControls: Control[] = [
  {
    name: 'VideoPlayer',
    // video has no ideal height to report, so it takes the box React Native gave it.
    layout: 'fill',
    imports: ['AVKit'],
    fields: {
      url: { type: 'string', default: '' },
      autoplay: { type: 'boolean', default: false },
    },
    constructors: [
      {
        type: 'VideoPlayer',
        parameters: [{ label: 'player', type: 'AVFoundation.AVPlayer?' }],
      },
    ],
    swift: `VideoPlayerSurface(url: model.url, autoplay: model.autoplay)`,
    extraSwift: `// AVPlayer holds the playback position and is expensive to build, so it is created once per
// url and replaced only when the url changes. building it in body would restart playback
// every time any other prop moved.
private struct VideoPlayerSurface: View {
  let url: String
  let autoplay: Bool
  @State private var player: AVPlayer?
  @State private var loaded: String?
  var body: some View {
    VideoPlayer(player: player)
      .onAppear { load() }
      .onChange(of: url) { load() }
  }
  // autoplay is read when the url loads, so flipping it later does not restart the video.
  private func load() {
    guard loaded != url else { return }
    loaded = url
    guard let parsed = URL(string: url) else { player = nil; return }
    let next = AVPlayer(url: parsed)
    player = next
    if autoplay { next.play() }
  }
}
`,
    validate: `  if (typeof url !== 'string' || !url) throw new Error('VideoPlayer url must be a non-empty string')`,
  },
]
