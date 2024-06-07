// forked from https://github.com/svitejs/vitefu/blob/main/src/index.js

import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'

// let pnp
// if (process.versions.pnp) {
//   try {
//     const { createRequire } = (await import('node:module')).default
//     pnp = createRequire(import.meta.url)('pnpapi')
//   } catch {}
// }

export { isDepIncluded, isDepExcluded, isDepNoExternaled, isDepExternaled }

export async function crawlFrameworkPkgs(options) {
  const pkgJsonPath = await findClosestPkgJsonPath(options.root)
  if (!pkgJsonPath) {
    // @ts-expect-error don't throw in deno as package.json is not required
    if (typeof Deno !== 'undefined') {
      return {
        optimizeDeps: { include: [], exclude: [] },
        ssr: { noExternal: [], external: [] },
      }
    }
    throw new Error(`Cannot find package.json from ${options.root}`)
  }
  const pkgJson = await readJson(pkgJsonPath).catch((e) => {
    throw new Error(`Unable to read ${pkgJsonPath}`, { cause: e })
  })

  let optimizeDepsInclude: string[] = []
  let optimizeDepsExclude: string[] = []
  let ssrNoExternal: string[] = []
  let ssrExternal: string[] = []

  await crawl(pkgJsonPath, pkgJson)

  // respect vite user config
  if (options.viteUserConfig) {
    // remove includes that are explicitly excluded in optimizeDeps
    const _optimizeDepsExclude = options.viteUserConfig?.optimizeDeps?.exclude
    if (_optimizeDepsExclude) {
      optimizeDepsInclude = optimizeDepsInclude.filter(
        (dep) => !isDepExcluded(dep, _optimizeDepsExclude)
      )
    }
    // remove excludes that are explicitly included in optimizeDeps
    const _optimizeDepsInclude = options.viteUserConfig?.optimizeDeps?.include
    if (_optimizeDepsInclude) {
      optimizeDepsExclude = optimizeDepsExclude.filter(
        (dep) => !isDepIncluded(dep, _optimizeDepsInclude)
      )
    }
    // remove noExternals that are explicitly externalized
    const _ssrExternal = options.viteUserConfig?.ssr?.external
    if (_ssrExternal) {
      ssrNoExternal = ssrNoExternal.filter((dep) => !isDepExternaled(dep, _ssrExternal))
    }
    // remove externals that are explicitly noExternal
    const _ssrNoExternal = options.viteUserConfig?.ssr?.noExternal
    if (_ssrNoExternal) {
      ssrExternal = ssrExternal.filter((dep) => !isDepNoExternaled(dep, _ssrNoExternal))
    }
  }

  return {
    optimizeDeps: {
      include: optimizeDepsInclude,
      exclude: optimizeDepsExclude,
    },
    ssr: {
      noExternal: ssrNoExternal,
      external: ssrExternal,
    },
  }

  /**
   * crawl the package.json dependencies for framework packages. rules:
   * 1. a framework package should be `optimizeDeps.exclude` and `ssr.noExternal`.
   * 2. the deps of the framework package should be `optimizeDeps.include` and `ssr.external`
   *    unless the dep is also a framework package, in which case do no1 & no2 recursively.
   * 3. any non-framework packages that aren't imported by a framework package can be skipped entirely.
   * 4. a semi-framework package is like a framework package, except it isn't `optimizeDeps.exclude`,
   *    but only applies `ssr.noExternal`.
   * @param {string} pkgJsonPath
   * @param {Record<string, any>} pkgJson
   * @param {string[]} [parentDepNames]
   */
  async function crawl(
    pkgJsonPath: string,
    pkgJson: Record<string, any>,
    parentDepNames: string[] = []
  ) {
    const isRoot = parentDepNames.length === 0

    let deps = [
      ...Object.keys(pkgJson.dependencies || {}),
      ...(isRoot ? Object.keys(pkgJson.devDependencies || {}) : []),
    ]

    deps = deps.filter((dep) => {
      // skip circular deps
      if (parentDepNames.includes(dep)) {
        return false
      }

      const isFrameworkPkg = options.isFrameworkPkgByName?.(dep)
      const isSemiFrameworkPkg = options.isSemiFrameworkPkgByName?.(dep)
      if (isFrameworkPkg) {
        // framework packages should be excluded from optimization as esbuild can't handle them.
        // otherwise it'll cause https://github.com/vitejs/vite/issues/3910
        optimizeDepsExclude.push(dep)
        // framework packages should be noExternal so that they go through vite's transformation
        // pipeline, since nodejs can't support them.
        ssrNoExternal.push(dep)
      } else if (isSemiFrameworkPkg) {
        // semi-framework packages should do the same except for optimization exclude as they
        // aren't needed to work (they don't contain raw framework components)
        ssrNoExternal.push(dep)
      }

      // only those that are explictly false can skip crawling since we don't need to do anything
      // special for them
      if (isFrameworkPkg === false || isSemiFrameworkPkg === false) {
        return false
      }
      // if `true`, we need to crawl the nested deps to deep include and ssr externalize them in dev.
      // if `undefined`, it's the same as "i don't know". we need to crawl and find the package.json
      // to find out.
      return true
    })

    const promises = deps.map(async (dep) => {
      const depPkgJsonPath = await findDepPkgJsonPath(dep, pkgJsonPath)
      if (!depPkgJsonPath) return
      const depPkgJson = await readJson(depPkgJsonPath).catch(() => {})
      if (!depPkgJson) return

      // fast path if this dep is already a framework dep based on the filter condition above
      const cachedIsFrameworkPkg = ssrNoExternal.includes(dep)
      if (cachedIsFrameworkPkg) {
        return crawl(depPkgJsonPath, depPkgJson, parentDepNames.concat(dep))
      }

      // check if this dep is a framework dep, if so, track and crawl it
      const isFrameworkPkg = options.isFrameworkPkgByJson?.(depPkgJson)
      const isSemiFrameworkPkg = options.isSemiFrameworkPkgByJson?.(depPkgJson)
      if (isFrameworkPkg || isSemiFrameworkPkg) {
        // see explanation in filter condition above
        if (isFrameworkPkg) {
          optimizeDepsExclude.push(dep)
          ssrNoExternal.push(dep)
        } else if (isSemiFrameworkPkg) {
          ssrNoExternal.push(dep)
        }
        return crawl(depPkgJsonPath, depPkgJson, parentDepNames.concat(dep))
      }

      // if we're crawling in a non-root state, the parent is 100% a framework package
      // because of the above if block. in this case, if it's dep of a non-framework
      // package, handle special cases for them.
      if (!isRoot) {
        // deep include it if it's a CJS package, so it becomes ESM and vite is happy.
        if (await pkgNeedsOptimization(depPkgJson, depPkgJsonPath)) {
          optimizeDepsInclude.push(parentDepNames.concat(dep).join(' > '))
        }
        // also externalize it in dev so it doesn't trip vite's SSR transformation.
        // we do in dev only as build cannot access deep external packages in strict
        // dependency installations, such as pnpm.
        if (!options.isBuild && !ssrExternal.includes(dep)) {
          ssrExternal.push(dep)
        }
      }
    })

    await Promise.all(promises)
  }
}

export async function findDepPkgJsonPath(dep, parent) {
  // if (pnp) {
  //   try {
  //     const depRoot = pnp.resolveToUnqualified(dep, parent)
  //     if (!depRoot) return
  //     return path.join(depRoot, 'package.json')
  //   } catch {
  //     return
  //   }
  // }

  let root = parent
  while (root) {
    const pkg = path.join(root, 'node_modules', dep, 'package.json')
    try {
      await fs.access(pkg)
      // use 'node:fs' version to match 'vite:resolve' and avoid realpath.native quirk
      // https://github.com/sveltejs/vite-plugin-svelte/issues/525#issuecomment-1355551264
      return fsSync.realpathSync(pkg)
    } catch {}
    const nextRoot = path.dirname(root)
    if (nextRoot === root) break
    root = nextRoot
  }
}

export async function findClosestPkgJsonPath(dir: string, predicate?: Function) {
  if (dir.endsWith('package.json')) {
    dir = path.dirname(dir)
  }
  while (dir) {
    const pkg = path.join(dir, 'package.json')
    try {
      const stat = await fs.stat(pkg)
      if (stat.isFile() && (!predicate || (await predicate(pkg)))) {
        return pkg
      }
    } catch {}
    const nextDir = path.dirname(dir)
    if (nextDir === dir) break
    dir = nextDir
  }
}

export async function pkgNeedsOptimization(pkgJson: any, pkgJsonPath: string) {
  // only optimize if is cjs, using the below as heuristic
  // see https://github.com/sveltejs/vite-plugin-svelte/issues/162
  if (pkgJson.module || pkgJson.exports) return false
  // if have main, ensure entry is js so vite can prebundle it
  // see https://github.com/sveltejs/vite-plugin-svelte/issues/233
  if (pkgJson.main) {
    const entryExt = path.extname(pkgJson.main)
    return !entryExt || entryExt === '.js' || entryExt === '.cjs'
  }
  // check if has implicit index.js entrypoint to prebundle
  // see https://github.com/sveltejs/vite-plugin-svelte/issues/281
  // see https://github.com/solidjs/vite-plugin-solid/issues/70#issuecomment-1306488154
  try {
    await fs.access(path.join(path.dirname(pkgJsonPath), 'index.js'))
    return true
  } catch {
    return false
  }
}

async function readJson(findDepPkgJsonPath) {
  return JSON.parse(await fs.readFile(findDepPkgJsonPath, 'utf8'))
}

function isDepIncluded(dep, optimizeDepsInclude) {
  return optimizeDepsInclude.some((id) => parseIncludeStr(id) === dep)
}

function isDepExcluded(dep, optimizeDepsExclude) {
  dep = parseIncludeStr(dep)
  return optimizeDepsExclude.some((id) => id === dep || dep.startsWith(`${id}/`))
}

function isDepNoExternaled(dep, ssrNoExternal) {
  if (ssrNoExternal === true) {
    return true
  }
  return isMatch(dep, ssrNoExternal)
}

function isDepExternaled(dep, ssrExternal) {
  return ssrExternal.includes(dep)
}

/**
 * @param {string} raw could be "foo" or "foo > bar" etc
 */
function parseIncludeStr(raw) {
  const lastArrow = raw.lastIndexOf('>')
  return lastArrow === -1 ? raw : raw.slice(lastArrow + 1).trim()
}

/**
 * @param {string} target
 * @param {string | RegExp | (string | RegExp)[]} pattern
 */
function isMatch(target, pattern) {
  if (Array.isArray(pattern)) {
    return pattern.some((p) => isMatch(target, p))
  }
  if (typeof pattern === 'string') {
    return target === pattern
  }
  if (pattern instanceof RegExp) {
    return pattern.test(target)
  }
}
