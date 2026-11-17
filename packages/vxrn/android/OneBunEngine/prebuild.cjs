const { mkdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

function patchMainApplication(source) {
  const anchor = '      context = applicationContext,'
  if (!source.includes(anchor)) {
    throw new Error(
      '[one] cannot install the Android Bun engine: ReactHost context is missing'
    )
  }
  return source.replace(
    anchor,
    `${anchor}\n      jsRuntimeFactory = if (BuildConfig.DEBUG) null else dev.onejs.bun.BunInstance(),`
  )
}

function patchBuildGradle(source) {
  return `${source}\n// [vxrn/one] bun engine\napply from: new File(file(resolveNodePackage("vxrn/package.json")).parentFile, "android/OneBunEngine/engine.gradle")\n`
}

function generateCMake(dest) {
  const dir = join(dest, 'app/src/main/jni')
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'CMakeLists.txt'),
    `cmake_minimum_required(VERSION 3.22.1)
project(appmodules)
include(\${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)
add_subdirectory("\${ONE_BUN_SOURCE}" onebunengine)
`
  )
}

module.exports = { patchMainApplication, patchBuildGradle, generateCMake }
