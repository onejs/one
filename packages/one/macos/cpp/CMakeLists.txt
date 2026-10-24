cmake_minimum_required(VERSION 3.22)
project(OneMacosCore LANGUAGES C CXX OBJCXX)

# Compiles the platform neutral React Native C++ core from the app's installed
# react-native for macOS, plus the One macOS host (AppKit mounting, text layout,
# TurboModules). Inputs:
#   -DRN_ROOT=<path to node_modules/react-native>
#   -DRN_DEPS_ROOT=<dir holding ReactNativeDependenciesHeaders.xcframework>
#   -DNITRO_ROOT=<path to node_modules/react-native-nitro-modules>
#   -DOPSQLITE_ROOT=<path to node_modules/@op-engineering/op-sqlite>
#   -DWORKLETS_ROOT=<path to node_modules/react-native-worklets>
#   -DHERMES_ROOT=<extracted hermes-ios destroot, headers and hermesvm.framework>
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_OBJCXX_STANDARD 20)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

if(NOT RN_ROOT OR NOT RN_DEPS_ROOT OR NOT NITRO_ROOT OR NOT WORKLETS_ROOT OR NOT OPSQLITE_ROOT OR NOT HERMES_ROOT)
  message(FATAL_ERROR "set RN_ROOT, RN_DEPS_ROOT, NITRO_ROOT, WORKLETS_ROOT, OPSQLITE_ROOT and HERMES_ROOT")
endif()

set(ONE_CPP ${CMAKE_CURRENT_LIST_DIR})
set(ONE_HOST ${CMAKE_CURRENT_LIST_DIR}/../host)
set(ONE_SHARED_HOST ${CMAKE_CURRENT_LIST_DIR}/../../native-core/host)

set(DEPS_HEADERS ${RN_DEPS_ROOT}/ReactNativeDependenciesHeaders.xcframework/macos-arm64_x86_64/Headers)

include(${CMAKE_CURRENT_LIST_DIR}/../../native-core/rn-core.cmake)

file(GLOB ONE_SOURCES CONFIGURE_DEPENDS
  ${ONE_CPP}/*.cpp
  ${ONE_CPP}/*.mm
  ${ONE_CPP}/OneMacToggle/*.cpp
  ${ONE_CPP}/OneMacToggle/*.mm
  ${ONE_CPP}/OneMacImage/*.cpp
  ${ONE_CPP}/OneMacButton/*.cpp
  ${ONE_CPP}/OneMacButton/*.mm
  ${ONE_CPP}/OneMacSegmentedControl/*.cpp
  ${ONE_CPP}/OneMacSegmentedControl/*.mm
  ${ONE_CPP}/graphics/react/renderer/graphics/*.mm
  ${ONE_CPP}/textlayoutmanager/*.mm
  ${ONE_CPP}/textlayoutmanager/react/renderer/textlayoutmanager/*.mm
  ${ONE_CPP}/textlayoutmanager/*.cpp
  ${ONE_HOST}/*.mm
  ${ONE_HOST}/*.cpp
  ${ONE_HOST}/*/*.mm
  ${ONE_HOST}/*/*.cpp
  ${ONE_SHARED_HOST}/*.cpp
)

# apple only helpers from the iOS pod layout; they are plain foundation code
set(RN_APPLE_SOURCES
  ${RN_ROOT}/React/Fabric/Utils/PlatformRunLoopObserver.mm
  ${RN_ROOT}/React/Fabric/AppleEventBeat.cpp
  ${RC}/react/utils/platform/ios/react/utils/FollyConvert.mm
  ${RC}/react/utils/platform/ios/react/utils/LowPriorityExecutor.mm
)

# Nitro's shared C++ core plus its Apple platform sources; the Swift and
# ObjC glue stays out because the host installs Nitro from its own TurboModule
file(GLOB_RECURSE NITRO_SOURCES CONFIGURE_DEPENDS ${NITRO_ROOT}/cpp/*.cpp)
file(GLOB NITRO_APPLE_SOURCES CONFIGURE_DEPENDS
  ${NITRO_ROOT}/ios/platform/*.cpp
  ${NITRO_ROOT}/ios/threading/*.cpp
)

# worklets' shared C++ core plus its Foundation networking backend; its React
# module glue stays out because the host installs the proxy from its own TurboModule
file(GLOB_RECURSE WORKLETS_SOURCES CONFIGURE_DEPENDS ${WORKLETS_ROOT}/Common/cpp/worklets/*.cpp)
file(GLOB WORKLETS_APPLE_SOURCES CONFIGURE_DEPENDS
  ${WORKLETS_ROOT}/apple/worklets/apple/Networking/*.mm
  ${WORKLETS_ROOT}/apple/worklets/apple/PlatformLogger.mm)

file(READ ${WORKLETS_ROOT}/package.json WORKLETS_PACKAGE)
string(JSON WORKLETS_VERSION GET "${WORKLETS_PACKAGE}" version)
file(READ ${WORKLETS_ROOT}/src/featureFlags/staticFlags.json WORKLETS_FLAGS_JSON)
string(JSON WORKLETS_FLAG_COUNT LENGTH "${WORKLETS_FLAGS_JSON}")
set(WORKLETS_FEATURE_FLAGS "")
math(EXPR WORKLETS_FLAG_LAST "${WORKLETS_FLAG_COUNT} - 1")
foreach(i RANGE ${WORKLETS_FLAG_LAST})
  string(JSON flag_name MEMBER "${WORKLETS_FLAGS_JSON}" ${i})
  string(JSON flag_value GET "${WORKLETS_FLAGS_JSON}" ${flag_name})
  string(TOLOWER "${flag_value}" flag_value)
  string(APPEND WORKLETS_FEATURE_FLAGS "[${flag_name}:${flag_value}]")
endforeach()

# op-sqlite's shared C++ core on the system sqlite (its "phone version" path):
# no bundled sqlite3.c, and the libsql, sqlcipher and turso backends stay out
file(GLOB OPSQLITE_SOURCES CONFIGURE_DEPENDS ${OPSQLITE_ROOT}/cpp/*.cpp)

add_library(OneMacosCore STATIC ${RN_SOURCES} ${RN_APPLE_SOURCES} ${NITRO_SOURCES} ${NITRO_APPLE_SOURCES} ${WORKLETS_SOURCES} ${WORKLETS_APPLE_SOURCES} ${OPSQLITE_SOURCES} ${ONE_SOURCES})

# the pod flattens headers, so every Nitro source directory is an include root
file(GLOB NITRO_INCLUDE_DIRS LIST_DIRECTORIES true ${NITRO_ROOT}/cpp/* ${NITRO_ROOT}/ios/*)

target_include_directories(OneMacosCore PUBLIC
  ${DEPS_HEADERS}
  ${HERMES_ROOT}/include
  ${RC}
  ${RC}/jsi
  ${RC}/callinvoker
  ${RC}/runtimeexecutor
  ${RC}/runtimeexecutor/platform/cxx
  ${RC}/yoga
  ${RC}/jsitooling
  ${RC}/reactperflogger
  ${RC}/react/renderer/imagemanager
  ${RC}/jsiexecutor
  ${RC}/react/nativemodule/core
  # the macOS color backend shadows the cxx one; Float.h still comes from cxx
  ${ONE_CPP}/graphics
  ${RC}/react/renderer/graphics/platform/cxx
  ${RC}/react/renderer/components/view/platform/cxx
  ${RC}/react/renderer/components/scrollview/platform/cxx
  ${RC}/react/renderer/components/text/platform/cxx
  ${RC}/react/renderer/components/textinput/platform/ios
  ${RC}/react/renderer/imagemanager/platform/cxx
  ${RC}/react/utils/platform/ios
  ${RC}/react/utils/platform/ios/react/utils
  ${RN_ROOT}/React/Fabric
  ${RN_ROOT}/React/Fabric/Utils
  ${RN_ROOT}/React/FBReactNativeSpec
  ${NITRO_INCLUDE_DIRS}
  ${WORKLETS_ROOT}/Common/cpp
  ${WORKLETS_ROOT}/apple
  ${ONE_CPP}/textlayoutmanager
  ${ONE_CPP}
  ${ONE_HOST}
  ${ONE_SHARED_HOST}
)

target_compile_definitions(OneMacosCore PUBLIC
  FOLLY_NO_CONFIG=1
  FOLLY_MOBILE=1
  FOLLY_USE_LIBCPP=1
  FOLLY_CFG_NO_COROUTINES=1
  FOLLY_HAVE_CLOCK_GETTIME=1
  RCT_NEW_ARCH_ENABLED=1
  HERMES_V1_ENABLED=1
  OP_SQLITE_USE_PHONE_VERSION=1
  WORKLETS_VERSION=${WORKLETS_VERSION}
  WORKLETS_FEATURE_FLAGS=${WORKLETS_FEATURE_FLAGS}
  $<$<CONFIG:Debug>:HERMES_ENABLE_DEBUGGER=1>
  REACT_NATIVE_DEBUGGER_ENABLED=1
  REACT_NATIVE_DEBUGGER_ENABLED_DEVONLY=1
  $<$<CONFIG:Debug>:DEBUG=1>
)

# op-sqlite's own headers are quote includes; <sqlite3.h> must stay the SDK's
target_compile_options(OneMacosCore PRIVATE
  -iquote ${OPSQLITE_ROOT}/cpp
  -Wno-comma -Wno-shorten-64-to-32 -Wno-documentation -Wno-deprecated-declarations
  $<$<COMPILE_LANGUAGE:OBJCXX>:-fobjc-arc>
)
