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

set(RC ${RN_ROOT}/ReactCommon)
set(ONE_CPP ${CMAKE_CURRENT_LIST_DIR})
set(ONE_HOST ${CMAKE_CURRENT_LIST_DIR}/../host)

set(DEPS_HEADERS ${RN_DEPS_ROOT}/ReactNativeDependenciesHeaders.xcframework/macos-arm64_x86_64/Headers)

# each entry is a directory under ReactCommon, compiled non recursively
set(RN_DIRS
  cxxreact
  jserrorhandler
  jsi/jsi
  jsiexecutor/jsireact
  jsinspector-modern
  jsinspector-modern/cdp
  jsinspector-modern/network
  jsinspector-modern/tracing
  jsitooling/react/runtime
  logger
  oscompat
  reactperflogger/reactperflogger
  reactperflogger/fusebox
  yoga/yoga
  yoga/yoga/algorithm
  yoga/yoga/config
  yoga/yoga/debug
  yoga/yoga/event
  yoga/yoga/node
  react/bridging
  react/cxxstableapi
  react/debug
  react/debug/redbox
  react/featureflags
  react/networking
  react/utils
  react/nativemodule/core/ReactCommon
  react/nativemodule/dom
  react/nativemodule/idlecallbacks
  react/performance/cdpmetrics
  react/performance/timeline
  react/renderer/animated
  react/renderer/animated/drivers
  react/renderer/animated/event_drivers
  react/renderer/animated/internal
  react/renderer/animated/nodes
  react/renderer/animationbackend
  react/renderer/animations
  react/renderer/attributedstring
  react/renderer/componentregistry
  react/renderer/componentregistry/native
  react/renderer/components/image
  react/renderer/components/legacyviewmanagerinterop
  react/renderer/components/root
  react/renderer/components/scrollview
  react/renderer/components/text
  react/renderer/components/textinput
  react/renderer/components/textinput/platform/ios/react/renderer/components/iostextinput
  react/renderer/components/unimplementedview
  react/renderer/components/view
  react/renderer/components/view/platform/cxx/react/renderer/components/view
  react/renderer/consistency
  react/renderer/core
  react/renderer/css
  react/renderer/debug
  react/renderer/dom
  react/renderer/element
  react/renderer/graphics
  react/renderer/imagemanager
  react/renderer/leakchecker
  react/renderer/mapbuffer
  react/renderer/mounting
  react/renderer/mounting/internal
  react/renderer/observers/events
  react/renderer/observers/intersection
  react/renderer/observers/mutation
  react/renderer/observers/resize
  react/renderer/runtimescheduler
  react/renderer/scheduler
  react/renderer/telemetry
  react/renderer/textlayoutmanager
  react/renderer/uimanager
  react/renderer/uimanager/consistency
  react/renderer/viewtransition
  react/runtime
  react/runtime/nativeviewconfig
  react/runtime/hermes
  hermes/inspector-modern/chrome
)

set(RN_SOURCES "")
foreach(dir ${RN_DIRS})
  file(GLOB found CONFIGURE_DEPENDS ${RC}/${dir}/*.cpp)
  list(APPEND RN_SOURCES ${found})
endforeach()
# runtimeexecutor ships its own cxx platform source
file(GLOB found CONFIGURE_DEPENDS ${RC}/runtimeexecutor/platform/cxx/ReactCommon/*.cpp)
list(APPEND RN_SOURCES ${found})

list(FILTER RN_SOURCES EXCLUDE REGEX "/(tests|test|iostests|android|windows|fantom|samples)/")
list(FILTER RN_SOURCES EXCLUDE REGEX "(Windows|CdpNetworkDummy)\\.cpp$")


file(GLOB ONE_SOURCES CONFIGURE_DEPENDS
  ${ONE_CPP}/*.cpp
  ${ONE_CPP}/*.mm
  ${ONE_CPP}/OneMacToggle/*.cpp
  ${ONE_CPP}/OneMacToggle/*.mm
  ${ONE_CPP}/OneMacButton/*.cpp
  ${ONE_CPP}/OneMacButton/*.mm
  ${ONE_CPP}/OneMacSegmentedControl/*.cpp
  ${ONE_CPP}/OneMacSegmentedControl/*.mm
  ${ONE_CPP}/textlayoutmanager/*.mm
  ${ONE_CPP}/textlayoutmanager/react/renderer/textlayoutmanager/*.mm
  ${ONE_CPP}/textlayoutmanager/*.cpp
  ${ONE_HOST}/*.mm
  ${ONE_HOST}/*.cpp
  ${ONE_HOST}/*/*.mm
  ${ONE_HOST}/*/*.cpp
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
