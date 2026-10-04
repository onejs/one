import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'
import {
  editedVideoBase64,
  photoBase64,
  rotatedVideoBase64,
  videoBase64,
} from './photo-library-proof-media'

const errorCode = (error: unknown) =>
  error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown'

function movieDurationMs(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (let index = 4; index + 36 < bytes.length; index++) {
    if (
      bytes[index] !== 109 ||
      bytes[index + 1] !== 118 ||
      bytes[index + 2] !== 104 ||
      bytes[index + 3] !== 100
    )
      continue
    if (view.getUint32(index - 4) < 32) continue
    const version = bytes[index + 4]
    const scale = view.getUint32(index + (version === 1 ? 24 : 16))
    const duration =
      version === 1 ? Number(view.getBigUint64(index + 28)) : view.getUint32(index + 20)
    if (scale > 0) return Math.round((duration * 1000) / scale)
  }
  return -1
}

export default function OneNativePhotoLibrary() {
  const [status, setStatus] = useState('idle')
  const [permission, setPermission] = useState(() =>
    One.PhotoLibrary.getAddPermissionStatus()
  )
  const [readPermission, setReadPermission] = useState(() =>
    One.PhotoLibrary.getReadPermissionStatus()
  )
  const [result, setResult] = useState('none')
  const [readResult, setReadResult] = useState('none')
  const [manageResult, setManageResult] = useState('none')
  const [editResult, setEditResult] = useState('none')
  const [videoEditResult, setVideoEditResult] = useState('none')
  const [limitedResult, setLimitedResult] = useState('none')
  const [albumResult, setAlbumResult] = useState('none')
  const [savedIds, setSavedIds] = useState<string[]>([])

  async function run() {
    setStatus('checking')
    try {
      const cache = One.FileSystem.getDirectories().cache
      const image = cache + 'one-native-photo-library.heic'
      const video = cache + 'one-native-photo-library.mp4'
      await One.FileSystem.writeFile(image, photoBase64, 'base64')
      await One.FileSystem.writeFile(video, videoBase64, 'base64')
      let before = 'alreadyGranted'
      if (permission === 'notDetermined') {
        try {
          await One.PhotoLibrary.saveImage(image)
        } catch (error) {
          before = errorCode(error)
        }
      }
      setStatus('requesting')
      const granted = await One.PhotoLibrary.requestAddPermission()
      setPermission(granted)
      if (granted !== 'authorized') throw new Error(`permission: ${granted}`)
      setStatus('saving')
      const imageId = await One.PhotoLibrary.saveImage(image)
      const videoId = await One.PhotoLibrary.saveVideo(video)
      setSavedIds([imageId, videoId])
      let uri = ''
      try {
        await One.PhotoLibrary.saveImage('https://onestack.dev/photo.heic')
      } catch (error) {
        uri = errorCode(error)
      }
      let file = ''
      try {
        await One.PhotoLibrary.saveVideo(cache + 'missing.mp4')
      } catch (error) {
        file = errorCode(error)
      }
      setResult(
        `before=${before}; permission=${granted}; image=${imageId.length > 0}; ` +
          `video=${videoId.length > 0}; distinct=${imageId !== videoId}; ` +
          `uri=${uri}; file=${file}`
      )
      setStatus('passed')
    } catch (error) {
      setStatus(
        `error: ${errorCode(error)} ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async function read() {
    setStatus('read-checking')
    try {
      const [imageId, videoId] = savedIds
      if (!imageId || !videoId) throw new Error('save the proof assets first')
      let before = 'alreadyGranted'
      let getBefore = 'alreadyGranted'
      let exportBefore = 'alreadyGranted'
      if (readPermission === 'notDetermined') {
        try {
          await One.PhotoLibrary.listAssets(0, 1)
        } catch (error) {
          before = errorCode(error)
        }
        try {
          await One.PhotoLibrary.getAsset(imageId)
        } catch (error) {
          getBefore = errorCode(error)
        }
        try {
          await One.PhotoLibrary.exportOriginalAsset(imageId)
        } catch (error) {
          exportBefore = errorCode(error)
        }
      }
      setStatus('read-requesting')
      const granted = await One.PhotoLibrary.requestReadPermission()
      const current = One.PhotoLibrary.getReadPermissionStatus()
      setReadPermission(current)
      if (current !== granted)
        throw new Error(`read status mismatch: ${current} / ${granted}`)
      if (granted !== 'authorized' && granted !== 'limited') {
        throw new Error(`read permission: ${granted}`)
      }
      setStatus('reading')
      const page = await One.PhotoLibrary.listAssets(0, 100)
      let listedImage = page.assets.some((asset) => asset.identifier === imageId)
      let listedVideo = page.assets.some((asset) => asset.identifier === videoId)
      for (
        let offset = 100;
        offset < page.totalCount && (!listedImage || !listedVideo);
        offset += 100
      ) {
        const next = await One.PhotoLibrary.listAssets(offset, 100)
        listedImage ||= next.assets.some((asset) => asset.identifier === imageId)
        listedVideo ||= next.assets.some((asset) => asset.identifier === videoId)
      }
      const image = await One.PhotoLibrary.getAsset(imageId)
      const video = await One.PhotoLibrary.getAsset(videoId)
      const exportedImage = await One.PhotoLibrary.exportOriginalAsset(imageId)
      let exportedVideo = ''
      let originalImage = false
      let originalVideo = false
      let imageExt = ''
      let videoExt = ''
      try {
        exportedVideo = await One.PhotoLibrary.exportOriginalAsset(videoId)
        imageExt = exportedImage.slice(exportedImage.lastIndexOf('.'))
        videoExt = exportedVideo.slice(exportedVideo.lastIndexOf('.'))
        const readBytes = async (uri: string) =>
          new Uint8Array(await (await fetch(uri)).arrayBuffer())
        const matches = (actual: Uint8Array, expected: Uint8Array) =>
          actual.length === expected.length &&
          actual.every((byte, index) => byte === expected[index])
        const cache = One.FileSystem.getDirectories().cache
        originalImage =
          imageExt === '.heic' &&
          matches(
            await readBytes(exportedImage),
            await readBytes(cache + 'one-native-photo-library.heic')
          )
        originalVideo =
          videoExt === '.mp4' &&
          matches(
            await readBytes(exportedVideo),
            await readBytes(cache + 'one-native-photo-library.mp4')
          )
      } finally {
        await One.FileSystem.delete(exportedImage)
        if (exportedVideo) await One.FileSystem.delete(exportedVideo)
      }
      let invalid = ''
      try {
        await One.PhotoLibrary.listAssets(0, 101)
      } catch (error) {
        invalid = errorCode(error)
      }
      let missing = ''
      try {
        await One.PhotoLibrary.getAsset('missing-asset-id')
      } catch (error) {
        missing = errorCode(error)
      }
      let exportInvalid = ''
      try {
        await One.PhotoLibrary.exportOriginalAsset('  ')
      } catch (error) {
        exportInvalid = errorCode(error)
      }
      let exportMissing = ''
      try {
        await One.PhotoLibrary.exportOriginalAsset('missing-asset-id')
      } catch (error) {
        exportMissing = errorCode(error)
      }
      setReadResult(
        `before=${before}; getBefore=${getBefore}; exportBefore=${exportBefore}; ` +
          `permission=${granted}; count=${page.totalCount}; ` +
          `listed=${listedImage && listedVideo}; ` +
          `image=${
            image.identifier === imageId &&
            image.mediaType === 'image' &&
            image.width > 0 &&
            image.height > 0 &&
            image.durationMs === 0 &&
            typeof image.creationDateMs === 'number' &&
            typeof image.isFavorite === 'boolean'
          }; ` +
          `video=${
            video.identifier === videoId &&
            video.mediaType === 'video' &&
            video.width > 0 &&
            video.height > 0 &&
            video.durationMs > 0 &&
            typeof video.creationDateMs === 'number' &&
            typeof video.isFavorite === 'boolean'
          }; ` +
          `invalid=${invalid}; missing=${missing}; originalImage=${originalImage}; ` +
          `originalVideo=${originalVideo}; imageExt=${imageExt}; videoExt=${videoExt}; ` +
          `exportInvalid=${exportInvalid}; exportMissing=${exportMissing}`
      )
      setStatus('read-passed')
    } catch (error) {
      setStatus(
        `read-error: ${errorCode(error)} ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async function manage() {
    setStatus('manage-checking')
    try {
      const [imageId, videoId] = savedIds
      if (!imageId || !videoId) throw new Error('save the proof assets first')
      const before = await One.PhotoLibrary.getAsset(imageId)
      setStatus('favoriting')
      await One.PhotoLibrary.setFavorite(imageId, true)
      const favorited = await One.PhotoLibrary.getAsset(imageId)
      await One.PhotoLibrary.setFavorite(imageId, false)
      const restored = await One.PhotoLibrary.getAsset(imageId)
      let invalid = ''
      try {
        await One.PhotoLibrary.setFavorite(' ', true)
      } catch (error) {
        invalid = errorCode(error)
      }
      let missing = ''
      try {
        await One.PhotoLibrary.deleteAsset('missing-asset-id')
      } catch (error) {
        missing = errorCode(error)
      }
      setStatus('deleting')
      await One.PhotoLibrary.deleteAsset(videoId)
      let deleted = ''
      try {
        await One.PhotoLibrary.getAsset(videoId)
      } catch (error) {
        deleted = errorCode(error)
      }
      const imageStillExists =
        (await One.PhotoLibrary.getAsset(imageId)).identifier === imageId
      setManageResult(
        `initial=${before.isFavorite}; favorite=${favorited.isFavorite}; ` +
          `restored=${restored.isFavorite}; invalid=${invalid}; missing=${missing}; ` +
          `deleted=${deleted}; preserved=${imageStillExists}`
      )
      setStatus('manage-passed')
    } catch (error) {
      setStatus(
        `manage-error: ${errorCode(error)} ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async function editImage() {
    setStatus('edit-checking')
    let transformedUri = ''
    let currentUri = ''
    let originalUri = ''
    let restoredCurrentUri = ''
    let decodedCurrentUri = ''
    let decodedRestoredUri = ''
    try {
      const [imageId, videoId] = savedIds
      if (!imageId || !videoId) throw new Error('save the proof assets first')
      const source =
        One.FileSystem.getDirectories().cache + 'one-native-photo-library.heic'
      const transformed = await One.ImageManipulator.transform(source, {
        format: 'jpeg',
        resize: { width: 60 },
      })
      transformedUri = transformed.uri
      const before = await One.PhotoLibrary.getAsset(imageId)
      let invalid = ''
      try {
        await One.PhotoLibrary.replaceImageContent(' ', transformed.uri)
      } catch (error) {
        invalid = errorCode(error)
      }
      let video = ''
      try {
        await One.PhotoLibrary.replaceImageContent(videoId, transformed.uri)
      } catch (error) {
        video = errorCode(error)
      }
      let uri = ''
      try {
        await One.PhotoLibrary.replaceImageContent(
          imageId,
          'https://onestack.dev/edit.jpg'
        )
      } catch (error) {
        uri = errorCode(error)
      }
      let format = ''
      try {
        await One.PhotoLibrary.replaceImageContent(imageId, source)
      } catch (error) {
        format = errorCode(error)
      }
      let currentVideo = ''
      try {
        await One.PhotoLibrary.exportCurrentImage(videoId)
      } catch (error) {
        currentVideo = errorCode(error)
      }
      setStatus('edit-applying')
      await One.PhotoLibrary.replaceImageContent(imageId, transformed.uri)
      const edited = await One.PhotoLibrary.getAsset(imageId)
      currentUri = await One.PhotoLibrary.exportCurrentImage(imageId)
      originalUri = await One.PhotoLibrary.exportOriginalAsset(imageId)
      const current = await One.FileSystem.getInfo(currentUri)
      const decodedCurrent = await One.ImageManipulator.transform(currentUri, {
        format: 'png',
      })
      decodedCurrentUri = decodedCurrent.uri
      const originalBytes = new Uint8Array(await (await fetch(originalUri)).arrayBuffer())
      const sourceBytes = new Uint8Array(await (await fetch(source)).arrayBuffer())
      const rendered =
        current.exists &&
        typeof current.size === 'number' &&
        current.size > 0 &&
        currentUri.endsWith('.jpeg') &&
        decodedCurrent.width === 60 &&
        decodedCurrent.height === 90
      const originalKept =
        originalUri.endsWith('.heic') &&
        originalBytes.length === sourceBytes.length &&
        originalBytes.every((byte, index) => byte === sourceBytes[index])
      await One.FileSystem.delete(currentUri)
      currentUri = ''
      await One.FileSystem.delete(originalUri)
      originalUri = ''
      setStatus('edit-reverting')
      await One.PhotoLibrary.revertAssetContent(imageId)
      const restored = await One.PhotoLibrary.getAsset(imageId)
      restoredCurrentUri = await One.PhotoLibrary.exportCurrentImage(imageId)
      const decodedRestored = await One.ImageManipulator.transform(restoredCurrentUri, {
        format: 'png',
      })
      decodedRestoredUri = decodedRestored.uri
      let missing = ''
      try {
        await One.PhotoLibrary.revertAssetContent('missing-asset-id')
      } catch (error) {
        missing = errorCode(error)
      }
      setEditResult(
        `invalid=${invalid}; video=${video}; uri=${uri}; format=${format}; currentVideo=${currentVideo}; ` +
          `before=${before.width}x${before.height}; edited=${edited.width}x${edited.height}; ` +
          `rendered=${rendered}; originalKept=${originalKept}; ` +
          `restored=${restored.width}x${restored.height}; restoredBytes=${
            decodedRestored.width === 80 && decodedRestored.height === 120
          }; missing=${missing}`
      )
      setStatus('edit-passed')
    } catch (error) {
      setStatus(
        `edit-error: ${errorCode(error)} ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      if (currentUri) await One.FileSystem.delete(currentUri)
      if (originalUri) await One.FileSystem.delete(originalUri)
      if (restoredCurrentUri) await One.FileSystem.delete(restoredCurrentUri)
      if (decodedCurrentUri) await One.FileSystem.delete(decodedCurrentUri)
      if (decodedRestoredUri) await One.FileSystem.delete(decodedRestoredUri)
      if (transformedUri) await One.FileSystem.delete(transformedUri)
    }
  }

  async function editVideo() {
    setStatus('video-edit-checking')
    let currentUri = ''
    let originalUri = ''
    let restoredUri = ''
    try {
      const [imageId, videoId] = savedIds
      if (!imageId || !videoId) throw new Error('save the proof assets first')
      const cache = One.FileSystem.getDirectories().cache
      const movie = cache + 'one-native-photo-library-edited.mov'
      const rotatedMovie = cache + 'one-native-photo-library-rotated.mov'
      await One.FileSystem.writeFile(movie, editedVideoBase64, 'base64')
      await One.FileSystem.writeFile(rotatedMovie, rotatedVideoBase64, 'base64')
      const before = await One.PhotoLibrary.getAsset(videoId)
      let invalid = ''
      try {
        await One.PhotoLibrary.replaceVideoContent(' ', movie)
      } catch (error) {
        invalid = errorCode(error)
      }
      let image = ''
      try {
        await One.PhotoLibrary.replaceVideoContent(imageId, movie)
      } catch (error) {
        image = errorCode(error)
      }
      let uri = ''
      try {
        await One.PhotoLibrary.replaceVideoContent(
          videoId,
          'https://onestack.dev/movie.mov'
        )
      } catch (error) {
        uri = errorCode(error)
      }
      let format = ''
      try {
        await One.PhotoLibrary.replaceVideoContent(
          videoId,
          cache + 'one-native-photo-library.mp4'
        )
      } catch (error) {
        format = errorCode(error)
      }
      let rotated = ''
      try {
        await One.PhotoLibrary.replaceVideoContent(videoId, rotatedMovie)
      } catch (error) {
        rotated = errorCode(error)
      }
      let currentImage = ''
      try {
        await One.PhotoLibrary.exportCurrentVideo(imageId)
      } catch (error) {
        currentImage = errorCode(error)
      }
      setStatus('video-edit-applying')
      await One.PhotoLibrary.replaceVideoContent(videoId, movie)
      const edited = await One.PhotoLibrary.getAsset(videoId)
      currentUri = await One.PhotoLibrary.exportCurrentVideo(videoId)
      originalUri = await One.PhotoLibrary.exportOriginalAsset(videoId)
      const currentBytes = new Uint8Array(await (await fetch(currentUri)).arrayBuffer())
      const originalBytes = new Uint8Array(await (await fetch(originalUri)).arrayBuffer())
      const sourceBytes = new Uint8Array(
        await (await fetch(cache + 'one-native-photo-library.mp4')).arrayBuffer()
      )
      const currentDuration = movieDurationMs(currentBytes)
      const originalKept =
        originalBytes.length === sourceBytes.length &&
        originalBytes.every((byte, index) => byte === sourceBytes[index])
      await One.FileSystem.delete(currentUri)
      currentUri = ''
      await One.FileSystem.delete(originalUri)
      originalUri = ''
      setStatus('video-edit-reverting')
      await One.PhotoLibrary.revertAssetContent(videoId)
      const restored = await One.PhotoLibrary.getAsset(videoId)
      restoredUri = await One.PhotoLibrary.exportCurrentVideo(videoId)
      const restoredBytes = new Uint8Array(await (await fetch(restoredUri)).arrayBuffer())
      const restoredDuration = movieDurationMs(restoredBytes)
      let missing = ''
      try {
        await One.PhotoLibrary.replaceVideoContent('missing-asset-id', movie)
      } catch (error) {
        missing = errorCode(error)
      }
      setVideoEditResult(
        `invalid=${invalid}; image=${image}; uri=${uri}; format=${format}; rotated=${rotated}; ` +
          `currentImage=${currentImage}; before=${Math.round(before.durationMs)}; ` +
          `edited=${Math.round(edited.durationMs)}; current=${currentDuration}; ` +
          `originalKept=${originalKept}; restored=${Math.round(restored.durationMs)}; ` +
          `restoredCurrent=${restoredDuration}; missing=${missing}`
      )
      setStatus('video-edit-passed')
    } catch (error) {
      setStatus(
        `video-edit-error: ${errorCode(error)} ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      if (currentUri) await One.FileSystem.delete(currentUri)
      if (originalUri) await One.FileSystem.delete(originalUri)
      if (restoredUri) await One.FileSystem.delete(restoredUri)
    }
  }

  async function requestLimited() {
    setStatus('limited-requesting')
    try {
      let before = ''
      try {
        await One.PhotoLibrary.presentLimitedLibraryPicker()
      } catch (error) {
        before = errorCode(error)
      }
      const granted = await One.PhotoLibrary.requestReadPermission()
      setReadPermission(One.PhotoLibrary.getReadPermissionStatus())
      if (granted !== 'limited') throw new Error(`limited permission: ${granted}`)
      const page = await One.PhotoLibrary.listAssets(0, 100)
      setLimitedResult(
        `before=${before}; permission=${granted}; visible=${page.totalCount}`
      )
      setStatus('limited-ready')
    } catch (error) {
      setStatus(
        `limited-error: ${errorCode(error)} ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async function pickLimited() {
    setStatus('limited-picking')
    try {
      const before = await One.PhotoLibrary.listAssets(0, 100)
      const added = await One.PhotoLibrary.presentLimitedLibraryPicker()
      const after = await One.PhotoLibrary.listAssets(0, 100)
      const readable = (
        await Promise.all(
          added.map((identifier) => One.PhotoLibrary.getAsset(identifier))
        )
      ).every((asset, index) => asset.identifier === added[index])
      const priorId = before.assets[0]?.identifier
      const preserved =
        !!priorId &&
        after.assets.some((asset) => asset.identifier === priorId) &&
        (await One.PhotoLibrary.getAsset(priorId)).identifier === priorId
      setLimitedResult(
        `added=${added.length}; expanded=${after.totalCount > before.totalCount}; ` +
          `unchanged=${after.totalCount === before.totalCount}; readable=${readable}; preserved=${preserved}; ` +
          `distinct=${new Set(added).size === added.length}; ` +
          `saved=${added.length > 0 && added.every((identifier) => savedIds.includes(identifier))}`
      )
      setStatus('limited-passed')
    } catch (error) {
      setStatus(
        `limited-error: ${errorCode(error)} ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async function albums() {
    setStatus('album-checking')
    try {
      const [imageId, videoId] = savedIds
      if (!imageId || !videoId) throw new Error('save the proof assets first')
      let invalid = ''
      try {
        await One.PhotoLibrary.createAlbum('   ')
      } catch (error) {
        invalid = errorCode(error)
      }
      let pageError = ''
      try {
        await One.PhotoLibrary.listAlbums(0, 101)
      } catch (error) {
        pageError = errorCode(error)
      }
      let missing = ''
      try {
        await One.PhotoLibrary.getAlbum('missing-album-id')
      } catch (error) {
        missing = errorCode(error)
      }
      const albumId = await One.PhotoLibrary.createAlbum('  One proof album  ')
      const created = await One.PhotoLibrary.getAlbum(albumId)
      const listedPage = await One.PhotoLibrary.listAlbums(0, 100)
      let listed = listedPage.albums.some((album) => album.identifier === albumId)
      for (let offset = 100; offset < listedPage.totalCount && !listed; offset += 100) {
        listed = (await One.PhotoLibrary.listAlbums(offset, 100)).albums.some(
          (album) => album.identifier === albumId
        )
      }
      await One.PhotoLibrary.addAssetToAlbum(albumId, imageId)
      await One.PhotoLibrary.addAssetToAlbum(albumId, videoId)
      const firstPage = await One.PhotoLibrary.listAlbumAssets(albumId, 0, 1)
      const secondPage = await One.PhotoLibrary.listAlbumAssets(albumId, 1, 1)
      const members = [firstPage.assets[0]?.identifier, secondPage.assets[0]?.identifier]
      await One.PhotoLibrary.renameAlbum(albumId, 'One proof renamed')
      const renamed = await One.PhotoLibrary.getAlbum(albumId)
      let badTitle = ''
      try {
        await One.PhotoLibrary.renameAlbum(albumId, ' ')
      } catch (error) {
        badTitle = errorCode(error)
      }
      let badAsset = ''
      try {
        await One.PhotoLibrary.addAssetToAlbum(albumId, 'missing-asset-id')
      } catch (error) {
        badAsset = errorCode(error)
      }
      await One.PhotoLibrary.removeAssetFromAlbum(albumId, imageId)
      const reduced = await One.PhotoLibrary.listAlbumAssets(albumId, 0, 10)
      const imagePreserved =
        (await One.PhotoLibrary.getAsset(imageId)).identifier === imageId
      setStatus('album-deleting')
      await One.PhotoLibrary.deleteAlbum(albumId)
      let deleted = ''
      try {
        await One.PhotoLibrary.getAlbum(albumId)
      } catch (error) {
        deleted = errorCode(error)
      }
      const videoPreserved =
        (await One.PhotoLibrary.getAsset(videoId)).identifier === videoId
      setAlbumResult(
        `invalid=${invalid}; page=${pageError}; missing=${missing}; ` +
          `created=${created.identifier === albumId && created.title === 'One proof album'}; listed=${listed}; ` +
          `added=${
            firstPage.totalCount === 2 &&
            secondPage.totalCount === 2 &&
            members.includes(imageId) &&
            members.includes(videoId)
          }; ` +
          `renamed=${renamed.title === 'One proof renamed'}; title=${badTitle}; asset=${badAsset}; ` +
          `removed=${reduced.totalCount === 1 && reduced.assets[0]?.identifier === videoId}; ` +
          `preserved=${imagePreserved && videoPreserved}; deleted=${deleted}`
      )
      setStatus('album-passed')
    } catch (error) {
      setStatus(
        `album-error: ${errorCode(error)} ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return (
    <View style={styles.screen}>
      <Text testID="one-native-photo-library-permission">Permission: {permission}</Text>
      <Text testID="one-native-photo-library-status">Status: {status}</Text>
      <Text testID="one-native-photo-library-result">Result: {result}</Text>
      <Text testID="one-native-photo-library-read-permission">
        Read permission: {readPermission}
      </Text>
      {albumResult !== 'none' ? (
        <Text testID="one-native-photo-library-album-result">
          Album result: {albumResult}
        </Text>
      ) : videoEditResult !== 'none' ? (
        <Text testID="one-native-photo-library-video-edit-result">
          Video edit result: {videoEditResult}
        </Text>
      ) : editResult !== 'none' ? (
        <Text testID="one-native-photo-library-edit-result">
          Edit result: {editResult}
        </Text>
      ) : (
        <Text testID="one-native-photo-library-read-result">
          Read result: {readResult}
        </Text>
      )}
      <Text testID="one-native-photo-library-manage-result">
        Manage result: {manageResult}
      </Text>
      <Text testID="one-native-photo-library-limited-result">
        Limited result: {limitedResult}
      </Text>
      <Pressable testID="one-native-photo-library-run" style={styles.chip} onPress={run}>
        <Text>Save image and video to Photos</Text>
      </Pressable>
      <Pressable
        testID="one-native-photo-library-read"
        style={styles.chip}
        onPress={read}
      >
        <Text>Read saved Photos assets</Text>
      </Pressable>
      {readPermission !== 'limited' && (
        <Pressable
          testID="one-native-photo-library-manage"
          style={styles.chip}
          onPress={manage}
        >
          <Text>Favorite and delete Photos assets</Text>
        </Pressable>
      )}
      {readPermission === 'authorized' && (
        <Pressable
          testID="one-native-photo-library-edit"
          style={styles.chip}
          onPress={editImage}
        >
          <Text>Replace and revert a Photos image</Text>
        </Pressable>
      )}
      {readPermission === 'authorized' && (
        <Pressable
          testID="one-native-photo-library-video-edit"
          style={styles.chip}
          onPress={editVideo}
        >
          <Text>Replace and revert a Photos video</Text>
        </Pressable>
      )}
      {readPermission === 'authorized' && (
        <Pressable
          testID="one-native-photo-library-albums"
          style={styles.chip}
          onPress={albums}
        >
          <Text>Create and edit a Photos album</Text>
        </Pressable>
      )}
      {readPermission === 'notDetermined' && (
        <Pressable
          testID="one-native-photo-library-limited-request"
          style={styles.chip}
          onPress={requestLimited}
        >
          <Text>Request limited Photos access</Text>
        </Pressable>
      )}
      {readPermission === 'limited' && (
        <Pressable
          testID="one-native-photo-library-limited-pick"
          style={styles.chip}
          onPress={pickLimited}
        >
          <Text>Choose more Photos assets</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12, backgroundColor: '#fff' },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
