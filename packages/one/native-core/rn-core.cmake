# The platform neutral React Native C++ core, shared by the macOS and Linux
# builds. Both include this file after setting RN_ROOT, then add RN_SOURCES (plus
# their own platform sources) to a library of their own.
#   RC          ${RN_ROOT}/ReactCommon
#   RN_DIRS     directories under ReactCommon, compiled non recursively
#   RN_SOURCES  the sources of those directories
set(RC ${RN_ROOT}/ReactCommon)

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
