import {
  CTFontDescriptor,
  CTFontDescriptorCopyAttribute,
  CTFontManagerCopyAvailableFontFamilyNames,
  CTFontManagerCopyAvailablePostScriptNames,
  CTFontManagerCreateFontDescriptorsFromURL,
  CTFontManagerError,
  CTFontManagerRegisterFontsForURL,
  kCTFontNameAttribute,
} from 'one/ios/CoreText'
import { CFErrorGetCode, CFURL } from 'one/ios/CoreFoundation'
import {
  NSArray,
  FileManager,
  HTTPURLResponse,
  NSData,
  NSString,
  NSURL,
  URLSession,
} from 'one/ios/Foundation'
import { SDKHandle } from 'one/ios-runtime'
import type { HybridObject } from 'react-native-nitro-modules'
import { Crypto } from '../crypto/index.native'
import type { OneFonts } from '../specs/OneFonts.nitro'
import { classifyScheme, fontExtension, isBenignRegisterError } from './map'

// runtime font loading for One.UI.Fonts. one path: make the uri a local
// file, register it for the process, then check the name. only the observed
// schemes ship: file:// is used as is, http(s):// is downloaded to
// Caches/one-fonts/<sha256 of url>.<ext>.
function fontsError(code: string, detail: string): Error {
  return Object.assign(new Error(`Fonts.load: ${detail}`), { code: `E_FONTS_${code}` })
}

// synchronous and live, so it is also true for embedded and system fonts:
// the PostScript registry first, then the family registry, as the swift's
// UIFont lookup plus family check did. there is no JS record of names.
function isLoaded(name: string): boolean {
  const postScript = new NSArray(CTFontManagerCopyAvailablePostScriptNames().$handle)
  if (postScript.contains(name)) return true
  const families = new NSArray(CTFontManagerCopyAvailableFontFamilyNames().$handle)
  return families.contains(name)
}

async function cachedFile(url: NSURL, name: string): Promise<NSURL> {
  const failed = (detail: string) => fontsError('DOWNLOAD', `"${name}" ${detail}`)
  const roots = FileManager.default.urls('cachesDirectory', ['userDomainMask'])
  const cachesRoot = roots[0]
  if (!cachesRoot) throw failed('could not be downloaded')
  const ext = fontExtension(url.pathExtension)
  const hash = await Crypto.digestString('SHA-256', url.absoluteString ?? '', {
    encoding: 'hex',
  })
  const directory = NSURL.initString(cachesRoot)?.appendingPathComponentIsDirectory(
    'one-fonts',
    true
  )
  if (!directory) throw failed('could not be downloaded')
  const file = NSURL.initString(directory)?.appendingPathComponent(`${hash}.${ext}`)
  if (!file) throw failed('could not be downloaded')
  const fileURL = NSURL.initString(file)
  if (!fileURL) throw failed('could not be downloaded')
  if (FileManager.default.fileExistsAtPath(fileURL.path ?? '')) return fileURL
  // async network i/o, as the swift's utility-queue dispatch did: a remote
  // transfer must never block the js thread. unsuccessful http rejects like
  // Data(contentsOf:)'s read error did; an error body is never cached.
  let result: readonly [ArrayBuffer, unknown]
  try {
    result = await URLSession.shared.dataFrom(url.absoluteString ?? '')
  } catch {
    throw failed('could not be downloaded')
  }
  const response = result[1]
  const status =
    response instanceof HTTPURLResponse
      ? response.statusCode
      : response instanceof SDKHandle
        ? new HTTPURLResponse(response.$handle).statusCode
        : 0
  if (status < 200 || status > 299) throw failed('could not be downloaded')
  const bytes = result[0]
  if (bytes.byteLength === 0) throw failed('downloaded zero bytes')
  try {
    FileManager.default.createDirectoryAtWithIntermediateDirectoriesAttributes(
      directory,
      true
    )
    NSData.initData(bytes).writeToOptions(file, ['atomic'])
  } catch {
    throw failed('could not be downloaded')
  }
  return fileURL
}

// the name attribute arrives as a native string handle (CFTypeRef-out
// preserves the class); description reads an NSString's own content.
function stringValue(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value instanceof NSString) return value.description
  if (value instanceof SDKHandle) return new NSString(value.$handle).description
  return null
}

function providedNames(fileRef: CFURL): string[] {
  const found = CTFontManagerCreateFontDescriptorsFromURL(fileRef)
  if (!found) return []
  const descriptors = new NSArray(found.$handle)
  const names: string[] = []
  for (let index = 0; index < descriptors.count; index += 1) {
    const raw = descriptors.object(index)
    const descriptor =
      raw instanceof CTFontDescriptor
        ? raw
        : raw instanceof SDKHandle
          ? new CTFontDescriptor(raw.$handle)
          : null
    if (!descriptor) continue
    const name = stringValue(
      CTFontDescriptorCopyAttribute(descriptor, kCTFontNameAttribute)
    )
    if (name !== null && name !== '') names.push(name)
  }
  return names
}

async function register(name: string, url: NSURL, isRemote: boolean): Promise<void> {
  let fileURL = url
  if (isRemote) {
    fileURL = await cachedFile(url, name)
  } else if (!FileManager.default.fileExistsAtPath(fileURL.path ?? '')) {
    throw fontsError('URI', `"${name}" points at a missing file`)
  }
  const fileRef = new CFURL(fileURL.$handle)
  const { $ret: registered, $out } = CTFontManagerRegisterFontsForURL(fileRef, 'process')
  if (!registered && $out.error) {
    const kind = CTFontManagerError.init(CFErrorGetCode($out.error))
    if (!isBenignRegisterError(kind)) {
      throw fontsError('REGISTER', `"${name}" could not be registered`)
    }
  }
  if (!isLoaded(name)) {
    const realNames = providedNames(fileRef)
    const provided =
      realNames.length === 0 ? '' : `, file provides ${realNames.join(', ')}`
    throw fontsError(
      'NAME',
      `"${name}" is not usable after registration (expected the PostScript name${provided})`
    )
  }
}

async function load(name: string, uri: string): Promise<void> {
  if (isLoaded(name)) return
  const url = NSURL.initString(uri)
  if (!url) throw fontsError('URI', `"${name}" is not a usable uri`)
  const scheme = classifyScheme(url.scheme)
  if (scheme === 'unsupported') {
    throw fontsError(
      'URI',
      `"${name}" uses an unsupported uri scheme "${(url.scheme ?? '').toLowerCase()}"`
    )
  }
  await register(name, url, scheme === 'remote')
}

const backend = {
  load,
  isLoaded,
} satisfies Omit<OneFonts, keyof HybridObject<{}>>

export function fontsNative() {
  return backend
}
