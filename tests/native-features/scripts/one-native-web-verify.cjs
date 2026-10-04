const { createRequire } = require('node:module')
const { resolve } = require('node:path')
const { mkdirSync, writeFileSync, mkdtempSync, rmSync } = require('node:fs')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const requireBrowser = process.env.PLAYWRIGHT_MODULE
  ? createRequire(resolve(process.env.PLAYWRIGHT_MODULE, 'package.json'))
  : require
const { chromium, webkit } = requireBrowser('playwright')
const sharp = require('sharp')
const destination = resolve(__dirname, '../evidence/one-native-web')
mkdirSync(destination, { recursive: true })
;(async () => {
  let failures = 0
  for (const [engine, type] of Object.entries({ chromium, webkit })) {
    const profile = mkdtempSync('/tmp/one-native-web-')
    const context = await type.launchPersistentContext(profile, {
      headless: true,
      ...(engine === 'webkit' && {
        recordVideo: {
          dir: resolve(profile, 'video'),
          size: { width: 480, height: 480 },
        },
      }),
      args:
        engine === 'chromium'
          ? [
              '--use-fake-device-for-media-stream',
              '--use-fake-ui-for-media-stream',
              '--autoplay-policy=no-user-gesture-required',
            ]
          : [],
      permissions:
        engine === 'chromium'
          ? ['geolocation', 'microphone', 'screen-wake-lock']
          : ['geolocation', 'screen-wake-lock'],
      geolocation: { latitude: 21.3069, longitude: -157.8583, accuracy: 5 },
      locale: 'en-US',
      timezoneId: 'Pacific/Honolulu',
      viewport: { width: 480, height: 480 },
      deviceScaleFactor: 1,
    })
    const browser = context.browser()
    const page = await context.newPage()
    const report = {
      engine,
      version: browser.version(),
      checks: [],
      failures: [],
      limitations: [],
    }
    page.on('pageerror', (error) =>
      report.failures.push({ namespace: 'page', error: String(error) })
    )
    const run = async (namespace, fn) => {
      try {
        const result = await Promise.race([
          page.evaluate(fn),
          new Promise((_, reject) => {
            const timer = setTimeout(
              () => reject(new Error(`${namespace} runtime condition did not complete`)),
              20000
            )
            timer.unref()
          }),
        ])
        report.checks.push({ namespace, ...result })
        console.log(`${engine} ${namespace}: PASS`)
      } catch (error) {
        failures++
        const observation =
          namespace === 'Audio'
            ? await page.evaluate(() => ({
                stage: window.proofStage,
                context: window.fakeAudio?.audio.state,
                calls: window.proofPermissionCalls,
                recorder: window.proofRecorder?.state,
                tracks: window.proofRecorder?.stream
                  .getTracks()
                  .map((track) => ({ state: track.readyState, muted: track.muted })),
              }))
            : undefined
        report.failures.push({ namespace, error: String(error), observation })
        if (observation) console.error(JSON.stringify(observation))
        console.error(`${engine} ${namespace}: FAIL ${String(error)}`)
      }
    }
    try {
      await page.goto(process.env.ONE_WEB_PROBE_URL || 'http://127.0.0.1:4387')
      await page.waitForFunction(() => window.services)
      await page.evaluate(() => {
        window.proof = {
          assert(value, message) {
            if (!value) throw new Error(message)
          },
          async rejects(fn, message) {
            let failed = false
            try {
              await fn()
            } catch {
              failed = true
            }
            if (!failed) throw new Error(message)
          },
        }
      })
      await run('FileSystem', async () => {
        const { FileSystem: fs } = window.services,
          { assert, rejects } = window.proof
        const dirs = fs.getDirectories(),
          base = dirs.cache + 'browser-proof-' + crypto.randomUUID() + '/'
        await fs.makeDirectory(base)
        await fs.writeFile(base + 'a.txt', 'café ✓')
        const origin = await navigator.storage.getDirectory(),
          cache = await origin.getDirectoryHandle('cache'),
          directory = await cache.getDirectoryHandle(base.split('/').at(-2))
        assert(
          (await (await (await directory.getFileHandle('a.txt')).getFile()).text()) ===
            'café ✓',
          'resolved write did not persist exact bytes'
        )
        const encoded = base + encodeURIComponent('e\u0301 +#.bin')
        await fs.writeFile(encoded, 'AAH+/w==', 'base64')
        const file = await (await directory.getFileHandle('e\u0301 +#.bin')).getFile()
        assert(
          JSON.stringify([...new Uint8Array(await file.arrayBuffer())]) ===
            '[0,1,254,255]',
          'base64 bytes differ'
        )
        const info = await fs.getInfo(encoded)
        assert(
          info.exists && !info.isDirectory && info.size === 4 && info.modifiedAt > 0,
          'file metadata differs'
        )
        const entries = await fs.readDirectory(base)
        assert(
          entries.length === 2 &&
            entries[1].name === 'e\u0301 +#.bin' &&
            (await fs.getInfo(entries[1].uri)).size === 4,
          'directory URI roundtrip differs'
        )
        const contenders = await Promise.allSettled([
          fs.copy(base + 'a.txt', base + 'race.txt'),
          fs.copy(base + 'a.txt', base + 'race.txt'),
        ])
        assert(
          contenders.filter((result) => result.status === 'fulfilled').length === 1 &&
            contenders.filter((result) => result.status === 'rejected').length === 1,
          'competing copies overwrote one destination'
        )
        await fs.copy(base + 'a.txt', base + 'copy.txt')
        assert(
          (await (await (await directory.getFileHandle('copy.txt')).getFile()).text()) ===
            'café ✓',
          'copy bytes differ'
        )
        await fs.move(base + 'copy.txt', base + 'moved.txt')
        assert(
          !(await fs.getInfo(base + 'copy.txt')).exists &&
            (await fs.getInfo(base + 'moved.txt')).exists,
          'move did not move'
        )
        await fs.makeDirectory(base + 'tree/inner/', true)
        await fs.writeFile(base + 'tree/inner/b.txt', 'nested')
        await fs.copy(base + 'tree/', base + 'tree-copy/')
        assert(
          (await fs.getInfo(base + 'tree-copy/inner/b.txt')).size === 6,
          'recursive copy differs'
        )
        await rejects(
          () => fs.copy(base + 'a.txt', base + 'a.txt'),
          'copy to existing file resolved'
        )
        await rejects(
          () => fs.copy(base + 'tree/', base + 'tree/child/'),
          'copy into descendant resolved'
        )
        await rejects(
          () => fs.writeFile(base + 'bad', '!', 'base64'),
          'invalid encoding resolved'
        )
        await rejects(
          () => fs.writeFile(base + 'missing/a', 'x'),
          'missing parent resolved'
        )
        await rejects(
          () => fs.makeDirectory(base + 'missing/a/', false),
          'intermediates false ignored'
        )
        await rejects(() => fs.delete(dirs.cache), 'protected root was deleted')
        await rejects(
          () => fs.writeFile('file:///outside', 'x'),
          'invalid scheme resolved'
        )
        await fs.delete(base)
        assert(!(await fs.getInfo(base)).exists, 'recursive deletion did not delete')
        return {
          negative:
            'byte reads, invalid encoding, missing parent, overlapping paths and protected root',
        }
      })
      const exifData = Buffer.alloc(120 * 80 * 3)
      const swatches = [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 0],
      ]
      for (let y = 0; y < 80; y++)
        for (let x = 0; x < 120; x++)
          exifData.set(swatches[(y >= 40 ? 2 : 0) + (x >= 60 ? 1 : 0)], (y * 120 + x) * 3)
      const exif = []
      for (let orientation = 1; orientation <= 8; orientation++) {
        const jpeg = await sharp(exifData, {
          raw: { width: 120, height: 80, channels: 3 },
        })
          .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
          .withMetadata({ orientation })
          .toBuffer()
        exif.push('data:image/jpeg;base64,' + jpeg.toString('base64'))
      }
      await page.evaluate((exif) => {
        window.exifFixtures = exif
      }, exif)
      await run('ImageManipulator', async () => {
        const { ImageManipulator: images } = window.services,
          { assert, rejects } = window.proof
        const canvas = document.createElement('canvas')
        canvas.width = 2
        canvas.height = 3
        const ctx = canvas.getContext('2d'),
          colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', 'transparent']
        colors.forEach((color, i) => {
          ctx.fillStyle = color
          ctx.fillRect(i % 2, Math.floor(i / 2), 1, 1)
        })
        const source = canvas.toDataURL()
        const pixels = async (result) => {
          const image = new Image()
          image.src = result.uri
          await image.decode()
          assert(
            image.width === result.width && image.height === result.height,
            'Image cannot decode returned URL'
          )
          const target = document.createElement('canvas')
          target.width = image.width
          target.height = image.height
          const context = target.getContext('2d')
          context.drawImage(image, 0, 0)
          return [...context.getImageData(0, 0, image.width, image.height).data]
        }
        const result = await images.transform(source, { rotate: 90, format: 'png' })
        const p = await pixels(result)
        assert(
          result.width === 3 && result.height === 2 && result.size > 0,
          'rotation dimensions differ'
        )
        assert(
          JSON.stringify(p.slice(0, 4)) === '[255,0,255,255]' &&
            JSON.stringify(p.slice(8, 12)) === '[255,0,0,255]' &&
            p[15] === 0,
          'rotation pixels or transparency differ'
        )
        let wrong = false
        try {
          assert(JSON.stringify(p.slice(0, 4)) === '[255,0,0,255]', 'wrong rotation')
        } catch {
          wrong = true
        }
        assert(wrong, 'wrong-rotation negative control did not fail')
        for (const [angle, corner] of [
          [0, [255, 0, 0, 255]],
          [180, [0, 0, 0, 0]],
          [270, [0, 255, 0, 255]],
        ]) {
          assert(
            JSON.stringify(
              (
                await pixels(
                  await images.transform(source, { rotate: angle, format: 'png' })
                )
              ).slice(0, 4)
            ) === JSON.stringify(corner),
            `rotation ${angle} differs`
          )
        }
        const crop = await images.transform(source, {
          crop: { x: 1, y: 0, width: 1, height: 2 },
          resize: { width: 2 },
          format: 'png',
        })
        assert(
          crop.width === 2 && crop.height === 4 && (await pixels(crop))[1] === 255,
          'crop or proportional resize differs'
        )
        const stretch = await images.transform(source, {
          resize: { width: 4, height: 4 },
          format: 'jpeg',
          quality: 1,
        })
        assert(
          stretch.width === 4 &&
            stretch.height === 4 &&
            (await fetch(stretch.uri)).headers.get('content-type') === 'image/jpeg',
          'JPEG encoding differs'
        )
        const vertical = await images.transform(source, {
          resize: { height: 6 },
          format: 'png',
        })
        assert(vertical.width === 4 && vertical.height === 6, 'height resize differs')
        const exifOrders = [
          [0, 1, 2, 3],
          [1, 0, 3, 2],
          [3, 2, 1, 0],
          [2, 3, 0, 1],
          [0, 2, 1, 3],
          [2, 0, 3, 1],
          [3, 1, 2, 0],
          [1, 3, 0, 2],
        ]
        const swatches = [
          [255, 0, 0],
          [0, 255, 0],
          [0, 0, 255],
          [255, 255, 0],
        ]
        for (let index = 0; index < 8; index++) {
          const value = await images.transform(window.exifFixtures[index], {
            format: 'png',
          })
          const width = index >= 4 ? 80 : 120,
            height = index >= 4 ? 120 : 80
          assert(
            value.width === width && value.height === height,
            `EXIF ${index + 1} axes differ`
          )
          const decoded = await pixels(value)
          for (let quadrant = 0; quadrant < 4; quadrant++) {
            const x = ((quadrant % 2 ? 3 : 1) * width) / 4,
              y = ((quadrant >= 2 ? 3 : 1) * height) / 4,
              offset = (y * width + x) * 4
            const actual = decoded.slice(offset, offset + 3),
              expected = swatches[exifOrders[index][quadrant]]
            assert(
              actual.every((channel, axis) => Math.abs(channel - expected[axis]) < 3),
              `EXIF ${index + 1} quadrant ${quadrant} differs`
            )
          }
          URL.revokeObjectURL(value.uri)
        }
        const oneImage = await window.renderImage(result.uri)
        assert(
          oneImage.width === 3 && oneImage.height === 2 && oneImage.uri === result.uri,
          'One.UI.Image rejected the transformed URL'
        )
        await rejects(
          () => images.transform(source, { rotate: 45 }),
          'invalid rotation resolved'
        )
        await rejects(
          () => images.transform(source, { crop: { x: 2, y: 0, width: 1, height: 1 } }),
          'out of bounds crop resolved'
        )
        await rejects(
          () => images.transform(source, { format: 'png', quality: 1 }),
          'PNG quality resolved'
        )
        await rejects(
          () => images.transform(source, { resize: { width: 10001 } }),
          'oversize resolved'
        )
        await rejects(
          () => images.transform('data:text/plain,bad'),
          'invalid image resolved'
        )
        for (const value of [result, crop, stretch, vertical])
          URL.revokeObjectURL(value.uri)
        return {
          exifOrientations: 8,
          oneImage: true,
          negative:
            'independent wrong-rotation pixels, invalid crop, rotation, format quality, size and decoder',
        }
      })
      await run('Device', async () => {
        const { Device } = window.services,
          { assert } = window.proof
        const info = await Device.getInfo(),
          locale = await Device.getLocalizationInfo()
        assert(
          info.systemName === navigator.platform &&
            !info.vendorIdentifier &&
            !info.isSimulator,
          'browser identity differs'
        )
        assert(
          locale.localeIdentifier === 'en-US' &&
            locale.timeZoneIdentifier === 'Pacific/Honolulu' &&
            locale.timeZoneOffsetSeconds === -36000 &&
            locale.preferredLanguages[0] === 'en-US',
          'localization differs'
        )
        assert(
          locale.timeZoneOffsetSeconds !== 0 && !info.model,
          'unknown hardware identity was invented'
        )
        return {
          info,
          locale,
          negative: 'known non-UTC zone and no invented hardware id',
        }
      })
      await run('Location', async () => {
        const { Location } = window.services,
          { assert } = window.proof
        const permission = await Location.requestWhenInUsePermission(),
          point = await Location.getCurrentPosition()
        assert(
          permission === 'whenInUse' && Location.getPermissionStatus() === 'whenInUse',
          'permission state differs'
        )
        assert(
          point.latitude === 21.3069 &&
            point.longitude === -157.8583 &&
            point.accuracy === 5 &&
            point.timestamp > 0,
          'position differs'
        )
        const watched = await new Promise((resolve, reject) => {
          const stop = Location.watchPosition((point) => {
            stop()
            resolve(point)
          }, reject)
        })
        assert(watched.latitude === point.latitude, 'watch differs')
        let error
        Location.watchPosition(
          () => {
            throw new Error('background watch delivered')
          },
          (value) => {
            error = value
          },
          { background: true }
        )()
        assert(
          error?.code === 'E_LOCATION_UNAVAILABLE',
          'background capability pretended success'
        )
        assert(
          (await Location.geocodeAddress('Honolulu')).length === 0 &&
            (await Location.reverseGeocode(21, -157)).length === 0,
          'unavailable geocoder contract differs'
        )
        return {
          point,
          negative: 'background watch rejected; geocoder remains unavailable',
        }
      })
      await run('KeepAwake', async () => {
        const { KeepAwake } = window.services,
          { assert, rejects } = window.proof
        assert(!(await KeepAwake.isEnabled()), 'initial wake state differs')
        await KeepAwake.setEnabled(true)
        assert(await KeepAwake.isEnabled(), 'wake lock did not activate')
        await KeepAwake.setEnabled(true)
        await KeepAwake.setEnabled(false)
        assert(!(await KeepAwake.isEnabled()), 'wake lock did not release')
        await rejects(() => KeepAwake.setEnabled('yes'), 'invalid boolean resolved')
        return { negative: 'released sentinel reports false and invalid input rejects' }
      })
      await run('Motion', async () => {
        const { Motion } = window.services,
          { assert, rejects } = window.proof
        assert(
          !Motion.getAvailability().magnetometer &&
            !Motion.getAvailability().accelerometer,
          'constructor claimed physical sensor availability'
        )
        const fast = [],
          slow = [],
          fused = []
        const nativeMotion = window.DeviceMotionEvent,
          nativeOrientation = window.DeviceOrientationEvent
        if (!nativeMotion) {
          await rejects(() => {
            let error
            Motion.addListener(
              'accelerometer',
              0,
              () => {},
              (code) => {
                error = code
              }
            )()
            assert(!error, 'motion unsupported')
          }, 'absent constructor pretended sensor support')
          window.DeviceMotionEvent = class extends Event {
            constructor(type, data) {
              super(type)
              Object.assign(this, data)
            }
          }
        }
        if (!nativeOrientation)
          window.DeviceOrientationEvent = class extends Event {
            constructor(type, data) {
              super(type)
              Object.assign(this, data)
            }
          }

        const f = Motion.addListener(
            'accelerometer',
            0,
            (value) => fast.push(value),
            () => {}
          ),
          s = Motion.addListener(
            'accelerometer',
            100,
            (value) => slow.push(value),
            () => {}
          ),
          d = Motion.addListener(
            'deviceMotion',
            0,
            (value) => fused.push(value),
            () => {}
          )
        window.dispatchEvent(
          new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: 0, gamma: 0 })
        )
        const sample = (time) => {
          const event = new DeviceMotionEvent('devicemotion', {
            accelerationIncludingGravity: { x: 9.80665, y: 0, z: 9.80665 },
            acceleration: { x: 9.80665, y: 0, z: 0 },
            rotationRate: { alpha: 180, beta: 90, gamma: 0 },
          })
          Object.defineProperty(event, 'timeStamp', { value: time })
          window.dispatchEvent(event)
        }
        sample(1000)
        sample(1050)
        sample(1100)
        assert(
          fast.length === 3 && slow.length === 2 && fused.length === 3,
          'independent sampling intervals differ'
        )
        assert(
          fast[0].value.x === -1 &&
            fused[0].gravity.z === -1 &&
            fused[0].rotationRate.x === Math.PI / 2 &&
            fused[0].attitude.x === 0,
          'sensor units or axes differ'
        )
        assert(
          Motion.getAvailability().accelerometer && Motion.getAvailability().deviceMotion,
          'observed sensor not available'
        )
        f()
        f()
        s()
        d()
        sample(1200)
        assert(fast.length === 3 && slow.length === 2, 'removed listeners delivered')
        let unavailable
        Motion.addListener(
          'magnetometer',
          0,
          () => {
            throw new Error('magnetometer delivered')
          },
          (code) => {
            unavailable = code
          }
        )()
        assert(unavailable === 'E_MOTION_UNAVAILABLE', 'magnetometer was invented')
        await rejects(
          () =>
            Motion.addListener(
              'gyroscope',
              -1,
              () => {},
              () => {}
            ),
          'invalid interval accepted'
        )
        window.DeviceMotionEvent = nativeMotion
        window.DeviceOrientationEvent = nativeOrientation
        return {
          seeded: true,
          realEventConstructors: !!nativeMotion,
          samples: fast.length + slow.length + fused.length,
          negative: 'removed subscription, unavailable magnetometer and invalid interval',
        }
      })
      await run('ScreenOrientation', async () => {
        const { ScreenOrientation: orientation } = window.services,
          { assert, rejects } = window.proof
        assert(
          (await orientation.getOrientation()) === 'landscapeLeft',
          'screen orientation mapping differs'
        )
        let changes = 0
        const remove = orientation.addChangeListener((value) => {
          assert(value === 'landscapeLeft', 'change mapping differs')
          changes++
        })
        screen.orientation.dispatchEvent(new Event('change'))
        remove()
        remove()
        screen.orientation.dispatchEvent(new Event('change'))
        assert(changes === 1, 'removed orientation listener delivered')
        await rejects(() => orientation.lock('diagonal'), 'invalid lock resolved')
        let lockOutcome
        try {
          lockOutcome = await orientation.lock('portrait')
        } catch (error) {
          lockOutcome = String(error)
        }
        // headless desktop has no screen rotation. retain the browser rejection.
        assert(
          typeof lockOutcome === 'string' &&
            /not supported|not implemented|unavailable|did not reach|Error/i.test(
              lockOutcome
            ),
          'headless lock pretended rotation'
        )
        if (screen.orientation.unlock) await orientation.unlock()
        else await rejects(() => orientation.unlock(), 'missing unlock resolved')
        return {
          lockOutcome,
          negative:
            'unsupported rotation must reject and removed listener must stay silent',
        }
      })
      await run('Print', async () => {
        const { Print } = window.services,
          { assert, rejects } = window.proof
        assert(
          (await Print.isAvailable()) === false,
          'current-page print claimed PDF completion support'
        )
        await rejects(
          () => Print.printPdf('file:///proof.pdf'),
          'PDF print pretended success'
        )
        return {
          unavailable: true,
          negative: 'PDF result contract has no browser equivalent',
        }
      })
      await run('Share', async () => {
        const { Share } = window.services,
          { assert, rejects } = window.proof
        const descriptor = Object.getOwnPropertyDescriptor(navigator, 'share'),
          original = navigator.share
        Object.defineProperty(navigator, 'share', {
          configurable: true,
          value: undefined,
        })
        await rejects(
          () => Share.share([{ type: 'text', value: 'proof' }]),
          'missing share resolved'
        )
        const seen = []
        Object.defineProperty(navigator, 'share', {
          configurable: true,
          value: async (data) => {
            seen.push(data)
          },
        })
        try {
          assert(
            (
              await Share.share([
                { type: 'text', value: 'first' },
                { type: 'text', value: 'second' },
                { type: 'url', value: 'https://example.com/' },
              ])
            ).completed,
            'share success mapping differs'
          )
          assert(
            seen[0].text === 'first\nsecond' && seen[0].url === 'https://example.com/',
            'shared data differs'
          )
          await rejects(() => Share.share([]), 'empty share resolved')
          Object.defineProperty(navigator, 'share', {
            configurable: true,
            value: async () => {
              throw new DOMException('cancelled', 'AbortError')
            },
          })
          assert(
            !(await Share.share([{ type: 'text', value: 'proof' }])).completed,
            'share cancellation reported completed'
          )
        } finally {
          if (descriptor) Object.defineProperty(navigator, 'share', descriptor)
          else delete navigator.share
        }
        return {
          browserHasShare: !!original,
          adapterSeeded: true,
          negative: 'absent capability, empty items and cancellation',
        }
      })
      await run('Contacts', async () => {
        const { Contacts } = window.services,
          { assert, rejects } = window.proof
        assert(
          !navigator.contacts && Contacts.getPermissionStatus() === 'denied',
          'absent picker claimed permission'
        )
        await rejects(() => Contacts.pickContact(), 'absent picker resolved')
        await rejects(
          () =>
            Contacts.create({
              givenName: 'A',
              familyName: '',
              phoneNumbers: [],
              emailAddresses: [],
            }),
          'browser contact write resolved'
        )
        Object.defineProperty(navigator, 'contacts', {
          configurable: true,
          value: {
            getProperties: async () => ['name', 'tel', 'email'],
            select: async (fields, options) => {
              assert(
                fields.join(',') === 'name,tel,email' && options.multiple === false,
                'picker request differs'
              )
              return [
                { name: ['Ada Lovelace'], tel: ['123'], email: ['ada@example.com'] },
              ]
            },
          },
        })
        try {
          const contact = await Contacts.pickContact()
          assert(
            contact.givenName === 'Ada Lovelace' &&
              contact.identifier === '' &&
              contact.phoneNumbers[0] === '123',
            'picker mapping differs'
          )
        } finally {
          delete navigator.contacts
        }
        return {
          realPickerUnavailable: true,
          adapterSeeded: true,
          negative: 'absent picker and unavailable mutations reject',
        }
      })
      await run('Speech', async () => {
        const { Speech } = window.services,
          { assert, rejects } = window.proof
        const original = window.SpeechRecognition,
          prefixed = window.webkitSpeechRecognition
        assert(
          Speech.isAvailable() === !!(original || prefixed),
          'recognizer availability differs'
        )
        window.SpeechRecognition = undefined
        window.webkitSpeechRecognition = undefined
        assert(
          !Speech.isAvailable() &&
            (await Speech.getPermissions()).status === 'denied' &&
            (await Speech.requestPermissions()).canAskAgain === false,
          'absent recognizer availability differs'
        )
        await rejects(() => Speech.start({}, () => {}), 'absent recognizer started')
        const instances = []
        class Recognition extends EventTarget {
          constructor() {
            super()
            instances.push(this)
          }
          start() {
            this.dispatchEvent(new Event('start'))
          }
          stop() {
            this.dispatchEvent(new Event('end'))
          }
          abort() {
            this.dispatchEvent(new Event('end'))
          }
        }
        window.SpeechRecognition = Recognition
        try {
          const first = [],
            second = []
          const a = Speech.start({ lang: 'en-US' }, (event) => first.push(event))
          const result = (texts) => {
            const event = new Event('result')
            Object.assign(event, { results: texts.map((transcript) => [{ transcript }]) })
            return event
          }
          instances[0].dispatchEvent(result(['hello']))
          instances[0].dispatchEvent(result(['hello', 'world']))
          assert(first[2].transcript === 'hello world', 'full transcript differs')
          const b = Speech.start({}, (event) => second.push(event))
          a.stop()
          instances[0].dispatchEvent(result(['stale']))
          assert(first.length === 3, 'replaced session delivered')
          b.stop()
          instances[1].dispatchEvent(new Event('end'))
          assert(
            second.filter((event) => event.type === 'end').length === 1,
            'terminal event repeated'
          )
          const silent = [],
            c = Speech.start({}, (event) => silent.push(event))
          c.abort()
          assert(silent.length === 1, 'abort emitted end')
          const errors = []
          Speech.start({}, (event) => errors.push(event))
          const error = new Event('error')
          Object.assign(error, { error: 'network', message: 'offline' })
          instances.at(-1).dispatchEvent(error)
          instances.at(-1).dispatchEvent(new Event('end'))
          assert(
            errors.length === 2 && errors[1].error === 'network',
            'error followed by terminal end'
          )
        } finally {
          window.SpeechRecognition = original
          window.webkitSpeechRecognition = prefixed
        }
        return {
          realConstructorPresent: !!(original || prefixed),
          adapterSeeded: true,
          negative:
            'missing constructor, replaced callback, abort silence and exactly one terminal event',
        }
      })
      // webkit automation cannot grant microphone permission; feed its actual
      // MediaRecorder with a generated Web Audio stream instead of hardware.
      if (engine === 'webkit') {
        await page.evaluate(() => {
          const audio = new AudioContext(),
            oscillator = audio.createOscillator(),
            outputs = []
          window.proofPermissionCalls = []
          // retain the native wrappers between WebKit evaluation worlds.
          Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: navigator.mediaDevices })
          Object.defineProperty(navigator, 'permissions', { configurable: true, value: navigator.permissions })
          oscillator.start()
          Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
            configurable: true,
            value: async () => {
              window.proofPermissionCalls.push('getUserMedia')
              const output = audio.createMediaStreamDestination()
              oscillator.connect(output)
              outputs.push(output)
              return output.stream
            },
          })
          const query = navigator.permissions.query.bind(navigator.permissions)
          Object.defineProperty(navigator.permissions, 'query', {
            configurable: true,
            value: (descriptor) => {
              window.proofPermissionCalls.push('query ' + descriptor.name)
              return descriptor.name === 'microphone'
                ? Promise.resolve({ state: 'granted' })
                : query(descriptor)
            },
          })
          window.fakeAudio = { audio, oscillator, outputs }
        })
        await page.evaluate(() => {
          const button = document.createElement('button')
          button.id = 'enable-proof-audio'
          button.textContent = 'Begin audio proof'
          button.onclick = () => window.fakeAudio.audio.resume()
          document.body.append(button)
        })
        await page.locator('#enable-proof-audio').click()
        await page.waitForFunction(() => window.fakeAudio.audio.state === 'running')
        await page.locator('#enable-proof-audio').evaluate((node) => node.remove())
        report.limitations.push(
          'WebKit recording uses a generated Web Audio MediaStream because Playwright does not grant microphone permission on WebKit.'
        )
      }
      await page.evaluate(() => {
        const currentTime = Object.getOwnPropertyDescriptor(
          HTMLMediaElement.prototype,
          'currentTime'
        )
        Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
          ...currentTime,
          set(seconds) {
            window.proofSeek = { seconds, element: this, settled: false }
            this.addEventListener(
              'seeked',
              () => {
                window.proofSeek.settled = true
              },
              { once: true, capture: true }
            )
            currentTime.set.call(this, seconds)
          },
        })
        const Recorder = window.MediaRecorder
        window.proofChunk = new Promise((resolve, reject) => {
          let deadline
          window.proofChunkStart = () => {
            deadline = setTimeout(() => reject(new Error('recorder emitted no chunks')), 5000)
          }
          window.proofChunkResolve = () => {
            clearTimeout(deadline)
            resolve()
          }
        })
        window.MediaRecorder = class extends Recorder {
          constructor(...args) {
            super(...args)
            window.proofRecorder = this
            window.proofChunkStart()
            this.addEventListener('dataavailable', (event) => {
              if (event.data.size) window.proofChunkResolve()
            })
          }
        }
      })
      await run('Audio', async () => {
        const { Audio } = window.services,
          { assert, rejects } = window.proof
        window.proofStage = 'initialState'
        assert(
          (await Audio.getPlaybackStatus()).state === 'idle' &&
            (await Audio.getRecordingStatus()).state === 'idle',
          'initial audio state differs'
        )
        await rejects(() => Audio.pause(), 'pause with no player resolved')
        await rejects(() => Audio.stopRecording(), 'stop with no recorder resolved')
        window.proofStage = 'permission'
        assert(
          (await Audio.requestRecordingPermission()) === 'granted',
          'microphone request differs'
        )
        window.proofStage = 'queryPermission'
        assert(
          (await Audio.getRecordingPermissionStatus()) === 'granted',
          'microphone permission differs'
        )
        window.proofStage = 'startRecording'
        const recording = await Audio.startRecording()
        window.proofStage = 'chunks'
        await window.proofChunk
        assert(recording.state === 'recording', 'recording did not start')
        await rejects(() => Audio.startRecording(), 'overlapping recording started')
        await rejects(
          () => Audio.play('data:audio/wav;base64,'),
          'play during recording resolved'
        )
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        )
        assert((await Audio.pauseRecording()).state === 'paused', 'pause did not pause')
        const paused = (await Audio.getRecordingStatus()).durationMs
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        )
        assert(
          (await Audio.getRecordingStatus()).durationMs === paused,
          'paused duration advanced'
        )
        window.proofStage = 'resumeRecording'
        assert(
          (await Audio.resumeRecording()).state === 'recording',
          'resume did not record'
        )
        window.proofStage = 'analyseInput'
        const probeContext = new AudioContext(),
          microphone = await navigator.mediaDevices.getUserMedia({ audio: true })
        const analyser = probeContext.createAnalyser()
        probeContext.createMediaStreamSource(microphone).connect(analyser)
        const samples = new Float32Array(analyser.fftSize)
        await probeContext.resume()
        await new Promise((resolve, reject) => {
          const deadline = performance.now() + 5000
          const check = () => {
            analyser.getFloatTimeDomainData(samples)
            if (samples.some((value) => value !== 0)) resolve()
            else if (performance.now() > deadline)
              reject(new Error('fake microphone never delivered samples'))
            else requestAnimationFrame(check)
          }
          check()
        })
        microphone.getTracks().forEach((track) => track.stop())
        await probeContext.close()
        window.proofStage = 'stopRecording'
        const result = await Audio.stopRecording(),
          blob = await (await fetch(result.uri)).blob()
        assert(
          result.size > 0 &&
            blob.size === result.size &&
            result.durationMs > paused &&
            (await Audio.getRecordingStatus()).state === 'idle',
          'recording bytes, duration or cleanup differ'
        )
        // deterministic pcm fixture proves time and seek independently of recorder codecs.
        const count = 44100 * 2,
          bytes = new ArrayBuffer(44 + count * 2),
          view = new DataView(bytes)
        const text = (offset, value) =>
          [...value].forEach((char, index) =>
            view.setUint8(offset + index, char.charCodeAt(0))
          )
        text(0, 'RIFF')
        view.setUint32(4, 36 + count * 2, true)
        text(8, 'WAVE')
        text(12, 'fmt ')
        view.setUint32(16, 16, true)
        view.setUint16(20, 1, true)
        view.setUint16(22, 1, true)
        view.setUint32(24, 44100, true)
        view.setUint32(28, 88200, true)
        view.setUint16(32, 2, true)
        view.setUint16(34, 16, true)
        text(36, 'data')
        view.setUint32(40, count * 2, true)
        for (let i = 0; i < count; i++)
          view.setInt16(
            44 + i * 2,
            Math.round(Math.sin((i * 2 * Math.PI * 440) / 44100) * 10000),
            true
          )
        const uri = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }))
        window.proofStage = 'play'
        const playback = await Audio.play(uri)
        assert(
          playback.state === 'playing' && Math.abs(playback.durationMs - 2000) < 1,
          'playback or duration differs'
        )
        assert((await Audio.pause()).state === 'paused', 'playback pause differs')
        window.proofStage = 'seek'
        const seek = await Audio.seek(500)
        assert(
          window.proofSeek.seconds === 0.5 &&
            window.proofSeek.settled &&
            seek.positionMs === window.proofSeek.element.currentTime * 1000,
          `seek differs: request ${window.proofSeek.seconds}, settled ${window.proofSeek.settled}, reported ${seek.positionMs}, native ${window.proofSeek.element.currentTime * 1000}, state ${seek.state}`
        )
        await rejects(() => Audio.seek(-1), 'negative seek resolved')
        assert((await Audio.resume()).state === 'playing', 'playback resume differs')
        if (navigator.mediaSession) {
          await Audio.setNowPlayingInfo({
            title: 'Proof',
            artist: 'One',
            albumTitle: 'Browser',
          })
          assert(
            navigator.mediaSession.metadata.title === 'Proof',
            'now playing metadata differs'
          )
          await Audio.clearNowPlayingInfo()
          assert(navigator.mediaSession.metadata === null, 'metadata was not cleared')
          const handlers = {},
            originalHandler = navigator.mediaSession.setActionHandler.bind(
              navigator.mediaSession
            )
          navigator.mediaSession.setActionHandler = (action, handler) => {
            handlers[action] = handler
            originalHandler(action, handler)
          }
          const events = []
          try {
            const remove = Audio.watchRemoteCommands((event) => events.push(event))
            handlers.play({ action: 'play' })
            handlers.pause({ action: 'pause' })
            handlers.seekto({ action: 'seekto', seekTime: 1.25 })
            assert(
              events.length === 3 && events[2].positionMs === 1250,
              'remote command mapping differs'
            )
            remove()
            remove()
            assert(
              handlers.play === null &&
                handlers.pause === null &&
                handlers.seekto === null,
              'remote handlers were not released'
            )
          } finally {
            navigator.mediaSession.setActionHandler = originalHandler
          }
          await rejects(
            () => Audio.setNowPlayingInfo({ title: '' }),
            'blank metadata resolved'
          )
        } else
          await rejects(
            () => Audio.setNowPlayingInfo({ title: 'Proof' }),
            'missing media session resolved'
          )
        Audio.watchInterruptions(() => {})()
        await Audio.stop()
        assert(
          (await Audio.getPlaybackStatus()).state === 'idle',
          'stop did not clear playback'
        )
        window.proofStage = 'decode'
        const decoded = new window.Audio(result.uri)
        await new Promise((resolve, reject) => {
          decoded.onloadedmetadata = resolve
          decoded.onerror = reject
          decoded.load()
        })
        assert(decoded.readyState >= 1, 'recording URL did not decode')
        URL.revokeObjectURL(uri)
        URL.revokeObjectURL(result.uri)
        window.fakeAudio?.oscillator.stop()
        await window.fakeAudio?.audio.close()
        return {
          recording: result,
          mimeType: blob.type,
          negative:
            'absent operation, concurrent recording, paused duration, negative seek and invalid metadata',
        }
      })
      await page.evaluate(() => window.renderEffects())
      await page.waitForFunction(() =>
        document
          .querySelector('[data-testid=mask]')
          ?.children[1]?.style.maskImage.includes('svg')
      )
      await run('Blur', async () => {
        const { assert } = window.proof,
          node = document.querySelector('[data-testid=blur]')
        const style = getComputedStyle(node.children[0])
        assert(
          style.backdropFilter === 'blur(20px)' &&
            style.backgroundColor === 'rgba(255, 255, 255, 0.3)',
          'blur intensity or tint differs'
        )
        assert(
          getComputedStyle(node.children[1]).position === 'relative',
          'child text is below backdrop'
        )
        return {
          negative: 'zero-filter pixel comparison below',
          filter: style.backdropFilter,
        }
      })
      const capture = await page.screenshot({
        path: resolve(destination, `${engine}-effects.png`),
      })
      const raw = await sharp(capture)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      const pixel = (x, y) => [
        ...raw.data.subarray(
          (y * raw.info.width + x) * 4,
          (y * raw.info.width + x) * 4 + 4
        ),
      ]
      assert.deepEqual(
        pixel(40, 200),
        [255, 0, 0, 255],
        `${engine}: opaque mask side differs`
      )
      assert.deepEqual(
        pixel(120, 200),
        [0, 0, 255, 255],
        `${engine}: transparent mask side did not reveal backdrop`
      )
      assert.deepEqual(
        pixel(120, 320),
        [255, 0, 0, 255],
        `${engine}: invalid mask failed to render unmasked`
      )
      report.checks.push({
        namespace: 'Mask',
        pixels: [pixel(40, 200), pixel(120, 200), pixel(120, 320)],
        negative: 'opaque/transparent sides plus invalid mask passthrough',
      })
      await page.locator('[data-testid=blur]').evaluate((node) => {
        node.children[0].style.backdropFilter = 'none'
        node.children[0].style.webkitBackdropFilter = 'none'
      })
      const control = await sharp(
        await page.screenshot({
          path: resolve(destination, `${engine}-effects-no-blur.png`),
        })
      )
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      const p = (x, y) => [
        ...control.data.subarray(
          (y * control.info.width + x) * 4,
          (y * control.info.width + x) * 4 + 4
        ),
      ]
      const difference = Math.abs(pixel(60, 100)[0] - pixel(64, 100)[0]),
        baseline = Math.abs(p(60, 100)[0] - p(64, 100)[0])
      let compositorContrast = difference
      if (engine === 'webkit') {
        for (const [state, filter] of [
          ['blur', true],
          ['control', false],
        ]) {
          const capturePage = await context.newPage()
          await capturePage.goto(process.env.ONE_WEB_PROBE_URL || 'http://127.0.0.1:4387')
          await capturePage.waitForFunction(() => window.services)
          await capturePage.evaluate(() => window.renderEffects())
          await capturePage.waitForFunction(() =>
            document
              .querySelector('[data-testid=mask]')
              ?.children[1]?.style.maskImage.includes('svg')
          )
          if (!filter)
            await capturePage.locator('[data-testid=blur]').evaluate((node) => {
              node.children[0].style.backdropFilter = 'none'
              node.children[0].style.webkitBackdropFilter = 'none'
            })
          await capturePage.evaluate(
            () =>
              new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve))
              )
          )
          const video = capturePage.video()
          await capturePage.close()
          const videoPath = resolve(destination, `webkit-effects-${state}.webm`)
          await video.saveAs(videoPath)
          const framePath = resolve(destination, `webkit-effects-${state}-frame.png`)
          execFileSync('ffmpeg', [
            '-y',
            '-hide_banner',
            '-loglevel',
            'error',
            '-i',
            videoPath,
            '-vf',
            'reverse',
            '-frames:v',
            '1',
            framePath,
          ])
          const frame = await sharp(framePath)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true })
          const at = (x, y) => [
            ...frame.data.subarray(
              (y * frame.info.width + x) * 4,
              (y * frame.info.width + x) * 4 + 4
            ),
          ]
          const contrast = Math.abs(at(60, 100)[0] - at(64, 100)[0])
          if (filter) {
            compositorContrast = contrast
          } else
            assert(
              contrast > 100,
              'WebKit no-filter compositor control did not preserve stripes'
            )
        }
        report.limitations.push(
          `WebKit page.screenshot() excludes the backdrop filter (contrast ${difference}); retained headless compositor video frames prove the rendered blur.`
        )
      }
      report.checks.push({
        namespace: 'Blur pixels',
        snapshotContrast: difference,
        compositorContrast,
        controlContrast: baseline,
        passed: compositorContrast < 20 && baseline > 100,
      })
      assert(
        compositorContrast < 20 && baseline > 100,
        `${engine} blur failed its no-filter pixel control`
      )
    } catch (error) {
      failures++
      report.failures.push({ namespace: 'runner', error: String(error) })
    } finally {
      await context.close()
      rmSync(profile, { recursive: true })
      writeFileSync(
        resolve(destination, `${engine}.json`),
        JSON.stringify(report, null, 2) + '\n'
      )
    }
  }
  if (failures) process.exitCode = 1
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
