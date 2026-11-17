import { basename } from 'node:path'

// generated hosts share large React Native and Nitro headers. four hosts per
// unit amortize parsing and weak template emission while retaining parallelism.
export function emitNativeBatches(header: string, outputs: Map<string, string>) {
  const members = [...outputs.keys()]
    .filter(
      (path) => path.startsWith('ios/Generated/') && path.endsWith('ComponentView.mm')
    )
    .sort()
  for (let start = 0; start < members.length; start += 4) {
    outputs.set(
      `ios/Generated/OneNativeComponentBatch${start / 4}.mm`,
      header +
        members
          .slice(start, start + 4)
          .map((path) => `#include "${basename(path)}"`)
          .join('\n') +
        '\n'
    )
  }
  const shadows = [
    ...[...outputs.keys()].filter(
      (path) => path.startsWith('cpp/') && path.endsWith('ShadowNode.cpp')
    ),
    'cpp/OneNativeArrangementSlotShadowNode.cpp',
    'cpp/OneNativeContainerSlotShadowNode.cpp',
    'cpp/OneNativeContentShadowNode.cpp',
    'cpp/OneNativePortalShadowNode.cpp',
    'cpp/OneOverKeyboardViewShadowNode.cpp',
    'cpp/OneSwiftHostShadowNode.cpp',
  ].sort()
  for (let start = 0; start < shadows.length; start += 8) {
    outputs.set(
      `cpp/OneNativeShadowNodeBatch${start / 8}.cpp`,
      header +
        shadows
          .slice(start, start + 8)
          .map((path) => `#include "${basename(path)}"`)
          .join('\n') +
        '\n'
    )
  }
}
