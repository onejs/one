// `if #available` only compiles against an SDK that declares the symbol, so an app still
// building with the oldest supported Xcode fails on any newer API. code for an iOS past
// that SDK also sits behind the flag VxrnNative.podspec defines from the installed SDK;
// SDK_FLAGS must list every version the podspec defines.
const OLDEST_SUPPORTED_SDK = 26
const SDK_FLAGS: Record<string, string> = { '27': 'ONE_IOS_27_SDK', '27.1': 'ONE_IOS_27_1_SDK' }

// wraps availability-checked swift so older SDKs compile `fallback` instead (nothing when
// empty). the directives sit on their own lines, so the result starts on a fresh line.
export function sdkGuard(version: number, code: string, fallback: string) {
  if (version < OLDEST_SUPPORTED_SDK + 1) return code
  const flag = SDK_FLAGS[String(version)]
  if (!flag) throw new Error(`VxrnNative.podspec defines no SDK flag for iOS ${version}`)
  return `\n#if ${flag}\n${code}\n${fallback ? `#else\n${fallback}\n` : ''}#endif\n`
}
