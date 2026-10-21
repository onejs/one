cmake_minimum_required(VERSION 3.22)
project(OneMacosCore LANGUAGES C CXX OBJCXX)

# Compiles the platform neutral React Native C++ core from the app's installed
# react-native for macOS, plus the One macOS host (AppKit mounting, text layout,
# TurboModules). Inputs:
#   -DRN_ROOT=<path to node_modules/react-native>
#   -DRN_DEPS_ROOT=<dir holding ReactNativeDependenciesHeaders.xcframework>
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_OBJCXX_STANDARD 20)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

if(NOT RN_ROOT OR NOT RN_DEPS_ROOT)
  message(FATAL_ERROR "set RN_ROOT and RN_DEPS_ROOT")
endif()

set(RC ${RN_ROOT}/ReactCommon)
set(ONE_CPP ${CMAKE_CURRENT_LIST_DIR})
set(ONE_MACOS ${CMAKE_CURRENT_LIST_DIR}/../macos)

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
  jsc
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
  react/performance/cdpmetrics
  react/performance/timeline
  react/renderer/animationbackend
  react/renderer/animations
  react/renderer/attributedstring
  react/renderer/componentregistry
  react/renderer/componentregistry/native
  react/renderer/components/image
  react/renderer/components/root
  react/renderer/components/scrollview
  react/renderer/components/text
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
  react/renderer/imagemanager/platform/cxx/react/renderer/imagemanager
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

# the pod build skips these; they drag in android or hermes only code
list(FILTER RN_SOURCES EXCLUDE REGEX "/react/runtime/hermes/")

file(GLOB ONE_SOURCES CONFIGURE_DEPENDS
  ${ONE_CPP}/*.cpp
  ${ONE_CPP}/*.mm
  ${ONE_CPP}/OneMacToggle/*.cpp
  ${ONE_CPP}/OneMacToggle/*.mm
  ${ONE_CPP}/textlayoutmanager/*.mm
  ${ONE_CPP}/textlayoutmanager/react/renderer/textlayoutmanager/*.mm
  ${ONE_CPP}/textlayoutmanager/*.cpp
  ${ONE_MACOS}/*.mm
  ${ONE_MACOS}/*.cpp
  ${ONE_MACOS}/*/*.mm
  ${ONE_MACOS}/*/*.cpp
)

# apple only helpers from the iOS pod layout; they are plain foundation code
set(RN_APPLE_SOURCES
  ${RN_ROOT}/React/Fabric/Utils/PlatformRunLoopObserver.mm
  ${RN_ROOT}/React/Fabric/AppleEventBeat.cpp
  ${RC}/react/utils/platform/ios/react/utils/FollyConvert.mm
  ${RC}/react/utils/platform/ios/react/utils/LowPriorityExecutor.mm
)

add_library(OneMacosCore STATIC ${RN_SOURCES} ${RN_APPLE_SOURCES} ${ONE_SOURCES})

target_include_directories(OneMacosCore PUBLIC
  ${DEPS_HEADERS}
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
  ${RC}/react/renderer/imagemanager/platform/cxx
  ${RC}/react/utils/platform/ios
  ${RC}/react/utils/platform/ios/react/utils
  ${RN_ROOT}/React/Fabric
  ${RN_ROOT}/React/Fabric/Utils
  ${ONE_CPP}/textlayoutmanager
  ${ONE_CPP}
  ${ONE_MACOS}
)

target_compile_definitions(OneMacosCore PUBLIC
  FOLLY_NO_CONFIG=1
  FOLLY_MOBILE=1
  FOLLY_USE_LIBCPP=1
  FOLLY_CFG_NO_COROUTINES=1
  FOLLY_HAVE_CLOCK_GETTIME=1
  RCT_NEW_ARCH_ENABLED=1
  REACT_NATIVE_DEBUGGER_ENABLED=1
  REACT_NATIVE_DEBUGGER_ENABLED_DEVONLY=1
  $<$<CONFIG:Debug>:DEBUG=1>
)

target_compile_options(OneMacosCore PRIVATE
  -Wno-comma -Wno-shorten-64-to-32 -Wno-documentation -Wno-deprecated-declarations
  $<$<COMPILE_LANGUAGE:OBJCXX>:-fobjc-arc>
)
