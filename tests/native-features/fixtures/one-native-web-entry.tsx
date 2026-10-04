import React from 'react'
import { createRoot } from 'react-dom/client'
import { FileSystem } from '../../../packages/one/src/platform/file-system'
import { ImageManipulator } from '../../../packages/one/src/platform/image-manipulator'
import { Motion } from '../../../packages/one/src/platform/motion'
import { Device } from '../../../packages/one/src/platform/device'
import { KeepAwake } from '../../../packages/one/src/platform/keep-awake'
import { ScreenOrientation } from '../../../packages/one/src/platform/screen-orientation'
import { Share } from '../../../packages/one/src/platform/share'
import { Print } from '../../../packages/one/src/platform/print'
import { Location } from '../../../packages/one/src/platform/location'
import { Audio } from '../../../packages/one/src/platform/audio'
import { Speech } from '../../../packages/one/src/platform/speech'
import { Contacts } from '../../../packages/one/src/platform/contacts'
import { Blur } from '../../../packages/one/src/platform/effects/Blur'
import { Image as OneImage } from '../../../packages/one/src/platform/ui/Image'
import { Mask } from '../../../packages/one/src/platform/effects/Mask'

Object.assign(window, {
  services: {
    FileSystem,
    ImageManipulator,
    Motion,
    Device,
    KeepAwake,
    ScreenOrientation,
    Share,
    Print,
    Location,
    Audio,
    Speech,
    Contacts,
  },
})
const root = createRoot(document.getElementById('root')!)
Object.assign(window, {
  renderImage: (uri: string) =>
    new Promise((resolve, reject) =>
      root.render(
        <OneImage
          source={{ uri }}
          onLoad={(event) => resolve(event.nativeEvent.source)}
          onError={reject}
        />
      )
    ),
  renderEffects: () =>
    root.render(
      <div style={{ background: 'rgb(0,0,255)', width: 360, padding: 20 }}>
        <div
          style={{
            position: 'relative',
            width: 120,
            height: 120,
            background:
              'repeating-linear-gradient(90deg,black 0px,black 4px,white 4px,white 8px)',
          }}
        >
          <Blur
            testID="blur"
            intensity={100}
            tint="light"
            style={{ width: 120, height: 120 }}
          >
            <span style={{ color: 'red', fontSize: 20 }}>sharp</span>
          </Blur>
        </div>
        <Mask
          testID="mask"
          style={{ width: 120, height: 120 }}
          maskElement={
            <div
              style={{
                width: '100%',
                height: '100%',
                background:
                  'linear-gradient(to right, black 0%, black 50%, transparent 50%, transparent 100%)',
              }}
            />
          }
        >
          <div style={{ background: 'rgb(255,0,0)', width: 120, height: 120 }} />
        </Mask>
        <Mask
          testID="invalid-mask"
          style={{ width: 120, height: 120 }}
          maskElement={null}
        >
          <div style={{ background: 'rgb(255,0,0)', width: 120, height: 120 }} />
        </Mask>
      </div>
    ),
})
