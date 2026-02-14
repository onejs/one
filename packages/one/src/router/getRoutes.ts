import { getDefaultRenderMode } from '../config'
import { getPageExport } from '../utils/getPageExport'
import type { One } from '../vite/types'
import {
  matchArrayGroupName,
  matchDirectoryRenderMode,
  matchDynamicName,
  matchGroupName,
  matchInterceptPrefix,
  matchSlotName,
  removeSupportedExtensions,
  stripInterceptPrefix,
} from './matchers'
import type { DynamicConvention, RouteNode, SlotConfig } from './Route'

export type Options = {
  ignore?: RegExp[]
  preserveApiRoutes?: boolean
  ignoreRequireErrors?: boolean
  ignoreEntryPoints?: boolean
  importMode?: 'sync'
  platformRoutes?: boolean
  platform?: string
}

type DirectoryNode = {
  layout?: RouteNode[]
  middleware?: RouteNode
  files: Map<string, RouteNode[]>
  subdirectories: Map<string, DirectoryNode>
  /** Slot directories (@modal, @sidebar, etc.) for parallel routes */
  slots: Map<string, DirectoryNode>
  /** Render mode for this directory (e.g., from dashboard+ssr or api+api) */
  renderMode?: One.RouteRenderMode | 'api'
}

const validPlatforms = new Set(['android', 'ios', 'native', 'web'])

/**
 * Given a Metro context module, return an array of nested routes.
 *
 * This is a two step process:
 *  1. Convert the RequireContext keys (file paths) into a directory tree.
 *      - This should extrapolate array syntax into multiple routes
 *      - Routes are given a specificity score
 *  2. Flatten the directory tree into routes
 *      - Routes in directories without _layout files are hoisted to the nearest _layout
 *      - The name of the route is relative to the nearest _layout
 *      - If multiple routes have the same name, the most specific route is used
 */
export function getRoutes(
  contextModule: One.RouteContext,
  options: Options = {}
): RouteNode | null {
  const directoryTree = getDirectoryTree(contextModule, options)

  // If there are no routes
  if (!directoryTree) {
    return null
  }

  const rootNode = flattenDirectoryTreeToRoutes(directoryTree, options)

  if (!options.ignoreEntryPoints) {
    crawlAndAppendInitialRoutesAndEntryFiles(rootNode, options)
  }

  return rootNode
}

/**
 * Converts the One.RouteContext keys (file paths) into a directory tree.
 */
function getDirectoryTree(contextModule: One.RouteContext, options: Options) {
  const importMode = options.importMode || process.env.One_ROUTER_IMPORT_MODE

  const ignoreList: RegExp[] = [
    /^\.\/\+html\.[tj]sx?$/, // Ignore the top level ./+html file
    /\.d\.ts$/, // Ignore TypeScript declaration files
  ]

  if (options.ignore) {
    ignoreList.push(...options.ignore)
  }
  if (!options.preserveApiRoutes) {
    ignoreList.push(/\+api\.[tj]sx?$/)
  }

  const rootDirectory: DirectoryNode = {
    files: new Map(),
    subdirectories: new Map(),
    slots: new Map(),
  }

  let hasRoutes = false
  let isValid = false

  for (const filePath of contextModule.keys()) {
    if (ignoreList.some((regex) => regex.test(filePath))) {
      continue
    }

    isValid = true

    // First pass: determine parent render mode by traversing directories
    let parentRenderMode: One.RouteRenderMode | 'api' | undefined
    const pathParts = filePath.replace(/^\.\//, '').split('/')
    const directoryParts = pathParts.slice(0, -1)

    for (const part of directoryParts) {
      const dirRenderMode = matchDirectoryRenderMode(part)
      if (dirRenderMode) {
        // Inner folders override outer folders
        parentRenderMode = dirRenderMode.renderMode
      }
    }

    const meta = getFileMeta(filePath, options, parentRenderMode)

    // This is a file that should be ignored. e.g maybe it has an invalid platform?
    if (meta.specificity < 0) {
      continue
    }

    const type = meta.isLayout ? 'layout' : meta.renderMode || getDefaultRenderMode()

    let node: RouteNode = {
      type,

      loadRoute() {
        if (options.ignoreRequireErrors) {
          try {
            return contextModule(filePath)
          } catch {
            return {}
          }
        } else {
          return contextModule(filePath)
        }
      },

      contextKey: filePath,
      route: '', // This is overwritten during hoisting based upon the _layout
      dynamic: null,
      children: [], // While we are building the directory tree, we don't know the node's children just yet. This is added during hoisting
    }

    if (process.env.NODE_ENV === 'development') {
      // If the user has set the `One_ROUTER_IMPORT_MODE` to `sync` then we should
      // filter the missing routes.
      if (node.type !== 'api' && importMode === 'sync') {
        if (!getPageExport(node.loadRoute())) {
          continue
        }
      }
    }

    /**
     * A single filepath may be extrapolated into multiple routes if it contains array syntax.
     * Another way to thinking about is that a filepath node is present in multiple leaves of the directory tree.
     */

    for (const route of extrapolateGroups(meta.route)) {
      // Traverse the directory tree to its leaf node, creating any missing directories along the way
      const subdirectoryParts = route.split('/').slice(0, -1)

      // Start at the root directory and traverse the path to the leaf directory
      let directory = rootDirectory

      for (const part of subdirectoryParts) {
        // Check if this is a slot directory (@modal, @sidebar, etc.)
        const slotName = matchSlotName(part)

        if (slotName) {
          // Handle slot directory
          let slotDirectory = directory.slots.get(slotName)
          if (!slotDirectory) {
            slotDirectory = {
              files: new Map(),
              subdirectories: new Map(),
              slots: new Map(),
            }
            directory.slots.set(slotName, slotDirectory)
          }
          directory = slotDirectory
        } else {
          // Check for directory render mode suffix (e.g., dashboard+ssr)
          const dirRenderMode = matchDirectoryRenderMode(part)
          const dirName = dirRenderMode?.name ?? part

          // Handle regular subdirectory
          let subDirectory = directory.subdirectories.get(dirName)

          // Create any missing subdirectories
          if (!subDirectory) {
            subDirectory = {
              files: new Map(),
              subdirectories: new Map(),
              slots: new Map(),
              renderMode: dirRenderMode?.renderMode,
            }
            directory.subdirectories.set(dirName, subDirectory)
          }

          directory = subDirectory
        }
      }

      // Clone the node for this route with slot and intercept info
      node = {
        ...node,
        route,
        slotName: meta.slotName,
        intercept: meta.interceptMatch
          ? {
              levels: meta.interceptMatch.levels,
              targetPath: meta.interceptMatch.targetPath,
            }
          : undefined,
      }

      if (meta.isLayout) {
        directory.layout ??= []
        const existing = directory.layout[meta.specificity]
        if (existing) {
          // In production, use the first route found
          if (process.env.NODE_ENV !== 'production') {
            throw new Error(
              `The layouts "${filePath}" and "${existing.contextKey}" conflict on the route "/${route}". Please remove or rename one of these files.`
            )
          }
        } else {
          node = getLayoutNode(node, options)
          directory.layout[meta.specificity] = node
        }
      } else if (meta.isMiddleware) {
        directory.middleware = node
      } else if (type === 'api') {
        const fileKey = `${route}+api`
        let nodes = directory.files.get(fileKey)

        if (!nodes) {
          nodes = []
          directory.files.set(fileKey, nodes)
        }

        // API Routes have no specificity, they are always the first node
        const existing = nodes[0]

        if (existing) {
          // In production, use the first route found
          if (process.env.NODE_ENV !== 'production') {
            throw new Error(
              `The API route file "${filePath}" and "${existing.contextKey}" conflict on the route "/${route}". Please remove or rename one of these files.`
            )
          }
        } else {
          nodes[0] = node
        }
      } else {
        let nodes = directory.files.get(route)

        if (!nodes) {
          nodes = []
          directory.files.set(route, nodes)
        }

        /**
         * If there is an existing node with the same specificity, then we have a conflict.
         * NOTE(Platform Routes):
         *    We cannot check for specificity conflicts here, as we haven't processed all the context keys yet!
         *    This will be checked during hoisting, as well as enforcing that all routes have a non-platform route.
         */
        const existing = nodes[meta.specificity]
        if (existing) {
          // In production, use the first route found
          if (process.env.NODE_ENV !== 'production') {
            throw new Error(
              `The route files "${filePath}" and "${existing.contextKey}" conflict on the route "/${route}". Please remove or rename one of these files.`
            )
          }
        } else {
          hasRoutes ||= true
          nodes[meta.specificity] = node
        }
      }
    }
  }

  // If there are no routes/layouts then we should display the tutorial.
  if (!isValid) {
    return null
  }

  /**
   * If there are no top-level _layout, add a default _layout
   */
  if (!rootDirectory.layout) {
    rootDirectory.layout = [
      {
        type: 'layout',
        loadRoute: () => ({
          default: (
            (() => {
              try {
                return require('../views/Navigator')
              } catch (e) {
                // This can happen during unit testing with vitest, where we cannot just require TypeScript files. Currently we will not actually render the navigator in tests, so it's fine to mock it this way but still bring awareness of what's happening if it happens in actual runtime.
                return {
                  DefaultNavigator: () => {
                    throw e
                  },
                }
              }
            })() as typeof import('../views/Navigator')
          ).DefaultNavigator,
        }),
        // Generate a fake file name for the directory
        contextKey: 'router/build/views/Navigator.js',
        route: '',
        generated: true,
        dynamic: null,
        children: [],
      },
    ]
  }

  // Only include the sitemap if there are routes.
  if (hasRoutes) {
    appendSitemapRoute(rootDirectory)
  }
  appendNotFoundRoute(rootDirectory)

  return rootDirectory
}

/**
 * Flatten the directory tree into routes, hoisting routes to the nearest _layout.
 */
function flattenDirectoryTreeToRoutes(
  directory: DirectoryNode,
  options: Options,
  /* The nearest _layout file in the directory tree */
  layout?: RouteNode,
  /* Route names are relative to their layout */
  pathToRemove = '',
  parentMiddlewares?: RouteNode[]
) {
  /**
   * This directory has a _layout file so it becomes the new target for hoisting routes.
   */
  if (directory.layout) {
    const previousLayout = layout
    layout = getMostSpecific(directory.layout)

    // Add the new layout as a child of its parent
    if (previousLayout) {
      previousLayout.children.push(layout)
    }

    // `route` is the absolute pathname. We need to make this relative to the last _layout
    const newRoute = layout.route.replace(pathToRemove, '')
    pathToRemove = layout.route ? `${layout.route}/` : ''

    // Now update this layout with the new relative route and dynamic conventions
    layout.route = newRoute
    layout.dynamic = generateDynamic(layout.route)
  }

  // This should never occur as there will always be a root layout, but it makes the type system happy
  if (!layout) throw new Error('One Internal Error: No nearest layout')

  const middlewares = directory.middleware
    ? [...(parentMiddlewares || []), directory.middleware]
    : parentMiddlewares

  for (const routes of directory.files.values()) {
    // TODO(Platform Routes): We need to pick the most specific layout and ensure that all routes have a non-platform route.
    const routeNode = getMostSpecific(routes)

    // `route` is the absolute pathname. We need to make this relative to the nearest layout
    routeNode.route = routeNode.route.replace(pathToRemove, '')
    routeNode.dynamic = generateDynamic(routeNode.route)
    routeNode.middlewares = middlewares

    layout.children.push(routeNode)
  }

  // Recursively flatten the subdirectories
  for (const child of directory.subdirectories.values()) {
    flattenDirectoryTreeToRoutes(child, options, layout, pathToRemove, middlewares)
  }

  // Process slot directories (@modal, @sidebar, etc.) and attach to layout
  if (directory.slots.size > 0) {
    layout.slots = new Map()

    for (const [slotName, slotDir] of directory.slots) {
      const slotConfig = flattenSlotDirectory(slotDir, slotName, options, pathToRemove)
      layout.slots.set(slotName, slotConfig)
    }
  }

  return layout
}

/**
 * Flatten a slot directory into a SlotConfig
 */
function flattenSlotDirectory(
  directory: DirectoryNode,
  slotName: string,
  options: Options,
  pathToRemove: string
): SlotConfig {
  const interceptRoutes: RouteNode[] = []
  let defaultRoute: RouteNode | undefined

  // Process files in this slot directory
  for (const routes of directory.files.values()) {
    const routeNode = getMostSpecific(routes)

    // Strip the slot prefix and pathToRemove from the route for URL matching
    let cleanRoute = routeNode.route.replace(pathToRemove, '')

    // Strip slot prefix (@modal/, @sidebar/, etc.) and intercept prefixes
    cleanRoute = cleanRoute
      .split('/')
      .filter((segment) => !matchSlotName(segment)) // Remove @slot segments
      .map((segment) => stripInterceptPrefix(segment)) // Remove (.) prefixes
      .join('/')

    // Check if this is a default.tsx file
    if (cleanRoute.endsWith('default') || cleanRoute === 'default') {
      defaultRoute = {
        ...routeNode,
        route: cleanRoute,
        slotName,
        dynamic: generateDynamic(cleanRoute),
      }
    } else {
      interceptRoutes.push({
        ...routeNode,
        route: cleanRoute,
        slotName,
        dynamic: generateDynamic(cleanRoute),
      })
    }
  }

  // Process subdirectories within the slot
  for (const [subDirName, subDir] of directory.subdirectories) {
    const subRoutes = flattenSlotSubdirectory(
      subDir,
      slotName,
      options,
      pathToRemove,
      subDirName
    )
    interceptRoutes.push(...subRoutes)
  }

  return {
    name: slotName,
    defaultRoute,
    interceptRoutes,
  }
}

/**
 * Recursively flatten subdirectories within a slot
 */
function flattenSlotSubdirectory(
  directory: DirectoryNode,
  slotName: string,
  options: Options,
  pathToRemove: string,
  currentPath: string
): RouteNode[] {
  const routes: RouteNode[] = []

  // Process files
  for (const fileRoutes of directory.files.values()) {
    const routeNode = getMostSpecific(fileRoutes)

    // Build the full route path
    let cleanRoute = routeNode.route.replace(pathToRemove, '')

    // Strip slot prefix (@modal/, @sidebar/, etc.) and intercept prefixes
    cleanRoute = cleanRoute
      .split('/')
      .filter((segment) => !matchSlotName(segment)) // Remove @slot segments
      .map((segment) => stripInterceptPrefix(segment)) // Remove (.) prefixes
      .join('/')

    routes.push({
      ...routeNode,
      route: cleanRoute,
      slotName,
      dynamic: generateDynamic(cleanRoute),
    })
  }

  // Recurse into subdirectories
  for (const [subDirName, subDir] of directory.subdirectories) {
    const subPath = currentPath ? `${currentPath}/${subDirName}` : subDirName
    routes.push(
      ...flattenSlotSubdirectory(subDir, slotName, options, pathToRemove, subPath)
    )
  }

  return routes
}

function getFileMeta(
  key: string,
  options: Options,
  parentRenderMode?: One.RouteRenderMode | 'api'
) {
  // Remove the leading `./`
  key = key.replace(/^\.\//, '')

  const parts = key.split('/')
  let route = removeSupportedExtensions(key)
  const filename = parts[parts.length - 1]
  const filenameWithoutExtensions = removeSupportedExtensions(filename)

  const isLayout = filenameWithoutExtensions.startsWith('_layout')
  const isMiddleware = filenameWithoutExtensions.startsWith('_middleware')

  const [_fullname, renderModeFound] =
    filename.match(/\+(api|ssg|ssr|spa)\.(\w+\.)?[jt]sx?$/) || []
  const fileRenderMode = renderModeFound as 'api' | One.RouteRenderMode | undefined

  // Hierarchical render mode resolution:
  // 1. File suffix (highest priority)
  // 2. Parent folder suffix
  // 3. Falls back to getDefaultRenderMode() later (vite config)
  const renderMode = fileRenderMode ?? parentRenderMode

  // Strip render mode suffixes from directory names in the route
  // e.g., "dashboard+ssr/analytics" -> "dashboard/analytics"
  route = route
    .split('/')
    .map((segment) => {
      const dirRenderMode = matchDirectoryRenderMode(segment)
      return dirRenderMode ? dirRenderMode.name : segment
    })
    .join('/')

  if (
    filenameWithoutExtensions.startsWith('(') &&
    filenameWithoutExtensions.endsWith(')')
  ) {
    throw new Error(`Invalid route ./${key}. Routes cannot end with '(group)' syntax`)
  }

  // Nested routes cannot start with the '+' character, except for the '+not-found' route
  if (
    renderMode !== 'api' &&
    filename.startsWith('+') &&
    filenameWithoutExtensions !== '+not-found'
  ) {
    const renamedRoute = [...parts.slice(0, -1), filename.slice(1)].join('/')
    throw new Error(
      `Invalid route ./${key}. Route nodes cannot start with the '+' character. "Please rename to ${renamedRoute}"`
    )
  }

  // Detect slot directory in path (@modal, @sidebar, etc.)
  let slotName: string | undefined
  for (const part of parts) {
    const match = matchSlotName(part)
    if (match) {
      slotName = match
      break
    }
  }

  // Detect intercept prefix in directory names like (.)photos, (..)settings
  // Build full target path from intercept segment + remaining path segments
  let interceptMatch: ReturnType<typeof matchInterceptPrefix>
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const match = matchInterceptPrefix(part)
    if (match) {
      // Build full target path: intercept's targetPath + remaining path parts
      // Filter out 'index' since index.tsx represents the root of that directory
      const remainingParts = parts
        .slice(i + 1)
        .map((p) => removeSupportedExtensions(p))
        .filter((p) => p !== 'index')
      const fullTargetPath = [match.targetPath, ...remainingParts]
        .filter(Boolean)
        .join('/')
      interceptMatch = {
        ...match,
        targetPath: fullTargetPath,
      }
      break
    }
  }

  let specificity = 0

  const platformExtension = filenameWithoutExtensions.split('.')[1]
  const hasPlatformExtension = validPlatforms.has(platformExtension)
  const usePlatformRoutes = options.platformRoutes ?? true

  if (hasPlatformExtension) {
    if (!usePlatformRoutes) {
      // If the user has disabled platform routes, then we should ignore this file
      specificity = -1
    } else if (!options.platform) {
      // If we don't have a platform, then we should ignore this file
      // This used by typed routes, sitemap, etc
      specificity = -1
    } else if (platformExtension === options.platform) {
      // If the platform extension is the same as the options.platform, then it is the most specific
      specificity = 2
    } else if (platformExtension === 'native' && options.platform !== 'web') {
      // `native` is allow but isn't as specific as the platform
      specificity = 1
    } else if (platformExtension !== options.platform) {
      // Somehow we have a platform extension that doesn't match the options.platform and it isn't native
      // This is an invalid file and we will ignore it
      specificity = -1
    }

    if (renderMode === 'api' && specificity !== 0) {
      throw new Error(
        `Api routes cannot have platform extensions. Please remove '.${platformExtension}' from './${key}'`
      )
    }

    route = route.replace(new RegExp(`.${platformExtension}$`), '')
  }

  return {
    route,
    specificity,
    isLayout,
    isMiddleware,
    renderMode,
    slotName,
    interceptMatch,
  }
}

function getMostSpecific(routes: RouteNode[]) {
  const route = routes[routes.length - 1]

  if (!routes[0]) {
    throw new Error(
      ` [one] The file ${route.contextKey} does not have a fallback sibling file without a platform extension in routes (${routes[0]}, ${routes.length}):\n${routes.map((r) => r.contextKey || 'NONE').join('\n')}.`
    )
  }

  // This works even tho routes is holey array (e.g it might have index 0 and 2 but not 1)
  // `.length` includes the holes in its count
  return routes[routes.length - 1]
}

export function getIgnoreList(options?: Options) {
  const ignore: RegExp[] = [/^\.\/\+html\.[tj]sx?$/, ...(options?.ignore ?? [])]
  if (options?.preserveApiRoutes !== true) {
    ignore.push(/\+api\.[tj]sx?$/)
  }
  return ignore
}

/**
 * Generates a set of strings which have the router array syntax extrapolated.
 *
 * /(a,b)/(c,d)/e.tsx => new Set(['a/c/e.tsx', 'a/d/e.tsx', 'b/c/e.tsx', 'b/d/e.tsx'])
 */
export function extrapolateGroups(
  key: string,
  keys: Set<string> = new Set()
): Set<string> {
  const match = matchArrayGroupName(key)

  if (!match) {
    keys.add(key)
    return keys
  }
  const groups = match.split(',')
  const groupsSet = new Set(groups)

  if (groupsSet.size !== groups.length) {
    throw new Error(
      `Array syntax cannot contain duplicate group name "${groups}" in "${key}".`
    )
  }

  if (groups.length === 1) {
    keys.add(key)
    return keys
  }

  for (const group of groups) {
    extrapolateGroups(key.replace(match, group.trim()), keys)
  }

  return keys
}

export function generateDynamic(path: string): DynamicConvention[] | null {
  const dynamic = path
    .split('/')
    .map((part): DynamicConvention | null => {
      if (part === '+not-found') {
        return {
          name: '+not-found',
          deep: true,
          notFound: true,
        }
      }

      const dynamicMatch = matchDynamicName(part)
      if (!dynamicMatch) return null
      return { name: dynamicMatch.name, deep: dynamicMatch.deep }
    })
    .filter((part): part is DynamicConvention => !!part)

  return dynamic.length === 0 ? null : dynamic
}

function appendSitemapRoute(directory: DirectoryNode) {
  if (!directory.files.has('_sitemap')) {
    directory.files.set('_sitemap', [
      {
        loadRoute() {
          // console.warn(`Loading sitemap`)
          // const { Sitemap, getNavOptions } = require('../views/Sitemap')
          // return { default: Sitemap, getNavOptions }
          return { default: () => null, getNavOptions: () => {} }
        },
        route: '_sitemap',
        type: 'ssg',
        contextKey: '',
        generated: true,
        internal: true,
        dynamic: null,
        children: [],
      },
    ])
  }
}

function appendNotFoundRoute(directory: DirectoryNode) {
  if (!directory.files.has('+not-found')) {
    directory.files.set('+not-found', [
      {
        loadRoute() {
          return { default: () => null }
        },
        type: 'spa',
        route: '+not-found',
        contextKey: '',
        generated: true,
        internal: true,
        dynamic: [{ name: '+not-found', deep: true, notFound: true }],
        children: [],
      },
    ])
  }
}

function getLayoutNode(node: RouteNode, options: Options) {
  /**
   * A file called `(a,b)/(c)/_layout.tsx` will generate two _layout routes: `(a)/(c)/_layout` and `(b)/(c)/_layout`.
   * Each of these layouts will have a different initialRouteName based upon the first group name.
   *
   * So
   */

  // We may strip loadRoute during testing
  const groupName = matchGroupName(node.route)
  const childMatchingGroup = node.children.find((child) => {
    return child.route.replace(/\/index$/, '') === groupName
  })
  const initialRouteName = childMatchingGroup?.route
  // const loaded = node.loadRoute()
  // if (loaded?.unstable_settings) {
  //   // Allow unstable_settings={ initialRouteName: '...' } to override the default initial route name.
  //   initialRouteName = loaded.unstable_settings.initialRouteName ?? initialRouteName

  //   if (groupName) {
  //     // Allow unstable_settings={ 'custom': { initialRouteName: '...' } } to override the less specific initial route name.
  //     const groupSpecificInitialRouteName = loaded.unstable_settings?.[groupName]?.initialRouteName

  //     initialRouteName = groupSpecificInitialRouteName ?? initialRouteName
  //   }
  // }

  return {
    ...node,
    route: node.route.replace(/\/?_layout$/, ''),
    children: [], // Each layout should have its own children
    initialRouteName,
  }
}

function crawlAndAppendInitialRoutesAndEntryFiles(
  node: RouteNode,
  options: Options,
  entryPoints: string[] = []
) {
  if (node.type === 'spa' || node.type === 'ssg' || node.type === 'ssr') {
    node.entryPoints = [...new Set([...entryPoints, node.contextKey])]
  } else if (node.type === 'layout') {
    if (!node.children) {
      throw new Error(`Layout "${node.contextKey}" does not contain any child routes`)
    }

    // Every node below this layout will have it as an entryPoint
    entryPoints = [...entryPoints, node.contextKey]

    /**
     * Calculate the initialRouteNode
     *
     * A file called `(a,b)/(c)/_layout.tsx` will generate two _layout routes: `(a)/(c)/_layout` and `(b)/(c)/_layout`.
     * Each of these layouts will have a different initialRouteName based upon the first group.
     */
    const groupName = matchGroupName(node.route)
    const childMatchingGroup = node.children.find((child) => {
      return child.route.replace(/\/index$/, '') === groupName
    })
    let initialRouteName = childMatchingGroup?.route
    // We may strip loadRoute during testing
    const loaded = node.loadRoute()
    if (loaded?.unstable_settings) {
      // Allow unstable_settings={ initialRouteName: '...' } to override the default initial route name.
      initialRouteName = loaded.unstable_settings.initialRouteName ?? initialRouteName

      if (groupName) {
        // Allow unstable_settings={ 'custom': { initialRouteName: '...' } } to override the less specific initial route name.
        const groupSpecificInitialRouteName =
          loaded.unstable_settings?.[groupName]?.initialRouteName

        initialRouteName = groupSpecificInitialRouteName ?? initialRouteName
      }
    }

    if (initialRouteName) {
      const initialRoute = node.children.find((child) => child.route === initialRouteName)
      if (!initialRoute) {
        const validInitialRoutes = node.children
          .filter((child) => !child.generated)
          .map((child) => `'${child.route}'`)
          .join(', ')

        if (groupName) {
          throw new Error(
            `Layout ${node.contextKey} has invalid initialRouteName '${initialRouteName}' for group '(${groupName})'. Valid options are: ${validInitialRoutes}`
          )
        }
        throw new Error(
          `Layout ${node.contextKey} has invalid initialRouteName '${initialRouteName}'. Valid options are: ${validInitialRoutes}`
        )
      }

      // Navigators can add initialsRoutes into the history, so they need to be to be included in the entryPoints
      node.initialRouteName = initialRouteName
      entryPoints.push(initialRoute.contextKey)
    }

    for (const child of node.children) {
      crawlAndAppendInitialRoutesAndEntryFiles(child, options, entryPoints)
    }
  }
}
