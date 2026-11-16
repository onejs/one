// `if #available` only compiles against an SDK that declares the symbol, so an app still
// building with the oldest supported Xcode fails on any newer API. code for an iOS past
// that SDK also sits behind the flag One.podspec defines from the installed SDK;
// SDK_FLAGS must list every version the podspec defines.
const OLDEST_SUPPORTED_SDK = 26
const SDK_FLAGS: Record<string, string> = { '27': 'ONE_IOS_27_SDK', '27.1': 'ONE_IOS_27_1_SDK' }

// symbols the iOS 27 SDK back-deploys to an older iOS that Xcode 26.6's iOS 26.5 SDK does not
// declare (#1249); code naming one compiles only against the iOS 27 SDK whatever its availability
const MISSING_FROM_OLDEST_SDK = /\b(accessibilityPrefersCrossFadeTransitions|appEntityIdentifier)\b/

// wraps availability-checked swift so older SDKs compile `fallback` instead (nothing when
// empty). the directives sit on their own lines, so the result starts on a fresh line.
export function sdkGuard(version: number, code: string, fallback: string) {
  const sdk =
    version < OLDEST_SUPPORTED_SDK + 1 && MISSING_FROM_OLDEST_SDK.test(code)
      ? OLDEST_SUPPORTED_SDK + 1
      : version
  if (sdk < OLDEST_SUPPORTED_SDK + 1) return code
  const flag = SDK_FLAGS[String(sdk)]
  if (!flag) throw new Error(`One.podspec defines no SDK flag for iOS ${version}`)
  return `\n#if ${flag}\n${code}\n${fallback ? `#else\n${fallback}\n` : ''}#endif\n`
}
