import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// both fixture hooks share one optional url block, leaving all other scene
// contexts with the generated react native forwarding behavior.
export function prepareIosSceneFixture({
  marker,
  handler,
  imports = [],
}: {
  marker: string
  handler: string
  imports?: string[]
}) {
  const scenePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../ios/NativeFeatureTests/SceneDelegate.swift'
  )
  const scene = readFileSync(scenePath, 'utf8')
  const method =
    '  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {\n'
  const forwarding = '    RCTLinkingManager.scene(scene, openURLContexts: URLContexts)\n'
  const importPoint = 'import ReactAppDependencyProvider\n'
  const urlBlock = '    if let url = URLContexts.first?.url {\n'
  const start = scene.indexOf(method) + method.length
  const closing = scene.indexOf('\n  }\n', start)
  const end = closing + 1
  const body = scene.slice(start, end)
  const fixtureEnd = `    }\n${forwarding}`
  if (
    scene.split(method).length !== 2 ||
    closing === -1 ||
    !scene.includes(importPoint) ||
    (body !== forwarding && !(body.startsWith(urlBlock) && body.endsWith(fixtureEnd)))
  ) {
    throw new Error('generated SceneDelegate changed; update the fixture URL hook')
  }

  if (body.includes(marker)) return
  const patchedBody =
    body === forwarding
      ? `${urlBlock}${handler}\n${fixtureEnd}`
      : body.slice(0, -fixtureEnd.length) + `${handler}\n${fixtureEnd}`
  let patched = scene.slice(0, start) + patchedBody + scene.slice(end)
  for (const name of imports) {
    const line = `import ${name}\n`
    if (!patched.includes(line))
      patched = patched.replace(importPoint, importPoint + line)
  }
  writeFileSync(scenePath, patched)
}
