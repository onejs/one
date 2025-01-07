import module from 'node:module'
import path from 'node:path'
import FSExtra from 'fs-extra'

/*
This code block is partially copied from meta owned repos.
Copyright (c) Facebook, Inc. and its affiliates.
*/

export const generateForPlatform = async (
  root: string,
  platform: 'ios' | 'android',
  appConfig: any
) => {
  const dest = path.resolve(platform)
  const appName = appConfig.name
  const displayName = appConfig.displayName
  const require = module.createRequire(root)
  const importPath = require.resolve('@react-native-community/cli/build/tools/walk.js', {
    paths: [root],
  })
  const src = path.join(
    path.dirname(
      require.resolve('@react-native-community/template/template/package.json', {
        paths: [root],
      })
    ),
    platform
  )
  const walk = (await import(importPath)).default.default
  walk(src).forEach((absoluteSrc: string) => {
    const relativeFilePath = transformPath(path.relative(src, absoluteSrc))
      .replace(/HelloWorld/g, appName)
      .replace(/helloworld/g, appName.toLowerCase())
    const srcPath = absoluteSrc
    const destPath = path.resolve(dest, relativeFilePath)

    console.info('copying', '"' + srcPath + '"', 'to', '"' + destPath + '"')

    const replacements: Record<string, string> = {
      'Hello App Display Name': displayName || appName,
      HelloWorld: appName,
      helloworld: appName,
    }

    if (FSExtra.lstatSync(srcPath).isDirectory()) {
      if (!FSExtra.existsSync(destPath)) {
        FSExtra.mkdirSync(destPath)
      }
      return
    }

    const extension = path.extname(srcPath)

    if (['.png', '.jar', '.keystore'].includes(extension)) {
      FSExtra.copyFileSync(srcPath, destPath)
      return
    }
    const srcPermissions = FSExtra.statSync(srcPath).mode
    let content = FSExtra.readFileSync(srcPath, 'utf8')
    Object.entries(replacements).forEach(([regex, value]) => {
      content = content.replace(new RegExp(regex, 'g'), value)
    })
    FSExtra.writeFileSync(destPath, content, {
      encoding: 'utf8',
      mode: srcPermissions,
    })
  })
}

const transformPath = (filePath: string) => {
  return filePath
    .replace('_BUCK', 'BUCK')
    .replace('_gitignore', '.gitignore')
    .replace('_gitattributes', '.gitattributes')
    .replace('_babelrc', '.babelrc')
    .replace('_editorconfig', '.editorconfig')
    .replace('_eslintrc.js', '.eslintrc.js')
    .replace('_flowconfig', '.flowconfig')
    .replace('_buckconfig', '.buckconfig')
    .replace('_prettierrc.js', '.prettierrc.js')
    .replace('_bundle', '.bundle')
    .replace('_ruby-version', '.ruby-version')
    .replace('_node-version', '.node-version')
    .replace('_watchmanconfig', '.watchmanconfig')
    .replace('_xcode.env', '.xcode.env')
}
