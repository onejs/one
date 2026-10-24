cmake_minimum_required(VERSION 3.22)
project(OneLinuxCore LANGUAGES C CXX)

# Compiles the platform neutral React Native C++ core from the app's installed
# react-native for Linux, with the cxx platform backends react-native ships for
# text layout and images, and the headless smoke binary. Inputs:
#   -DRN_ROOT=<path to node_modules/react-native>
#   -DNITRO_ROOT=<path to node_modules/react-native-nitro-modules>
#   -DWORKLETS_ROOT=<path to node_modules/react-native-worklets>
#   -DOPSQLITE_ROOT=<path to node_modules/@op-engineering/op-sqlite>
#   -DHERMES_ROOT=<destroot prepare-hermes.sh wrote>
#   -DDEPS_CMAKE=<OneLinuxDeps.cmake from the deps build>
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

if(NOT RN_ROOT OR NOT NITRO_ROOT OR NOT WORKLETS_ROOT OR NOT OPSQLITE_ROOT OR NOT HERMES_ROOT OR NOT DEPS_CMAKE)
  message(FATAL_ERROR "set RN_ROOT, NITRO_ROOT, WORKLETS_ROOT, OPSQLITE_ROOT, HERMES_ROOT and DEPS_CMAKE")
endif()

include(${DEPS_CMAKE})
include(${CMAKE_CURRENT_LIST_DIR}/../../native-core/rn-core.cmake)

find_package(PkgConfig REQUIRED)
pkg_check_modules(GTK4 REQUIRED IMPORTED_TARGET gtk4 pangocairo libsoup-3.0 sqlite3)

set(ONE_LINUX ${CMAKE_CURRENT_LIST_DIR}/..)
set(ONE_SHARED_HOST ${CMAKE_CURRENT_LIST_DIR}/../../native-core/host)
file(GLOB ONE_SHARED_HOST_SOURCES ${ONE_SHARED_HOST}/*.cpp)

# the cxx text layout stub is replaced by the Pango one; images stay the cxx stub
set(RN_LINUX_SOURCES
  ${RC}/react/renderer/imagemanager/platform/cxx/react/renderer/imagemanager/ImageManager.cpp
  ${RN_ROOT}/React/Fabric/AppleEventBeat.cpp
  ${ONE_LINUX}/cpp/textlayoutmanager/OneLinuxText.cpp
  ${ONE_LINUX}/cpp/textlayoutmanager/react/renderer/textlayoutmanager/TextLayoutManager.cpp
  ${ONE_LINUX}/cpp/OneLinuxSwitch/OneLinuxSwitchEventEmitter.cpp
  ${ONE_LINUX}/cpp/OneLinuxSwitch/OneLinuxSwitchProps.cpp
  ${ONE_LINUX}/cpp/OneLinuxSwitch/OneLinuxSwitchShadowNode.cpp
  ${ONE_SHARED_HOST_SOURCES}
)

# Nitro's shared C++ core plus the Linux platform sources; the host installs
# Nitro from its own TurboModule, so no autolinking glue is compiled
file(GLOB_RECURSE NITRO_SOURCES CONFIGURE_DEPENDS ${NITRO_ROOT}/cpp/*.cpp)
file(GLOB NITRO_INCLUDE_DIRS LIST_DIRECTORIES true ${NITRO_ROOT}/cpp/*)

# worklets' shared C++ core; the host provides its logger, networking backend and
# TurboModule, so no platform glue is compiled
file(GLOB_RECURSE WORKLETS_SOURCES CONFIGURE_DEPENDS ${WORKLETS_ROOT}/Common/cpp/worklets/*.cpp)
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

set_source_files_properties(${WORKLETS_ROOT}/Common/cpp/worklets/RunLoop/AsyncQueueImpl.cpp
  PROPERTIES COMPILE_FLAGS "-include ${ONE_LINUX}/cpp/compat/OneLinuxThreadName.h")

# op-sqlite's shared C++ core on the system sqlite (its "phone version" path):
# no bundled sqlite3.c, and the libsql, sqlcipher and turso backends stay out
file(GLOB OPSQLITE_SOURCES CONFIGURE_DEPENDS ${OPSQLITE_ROOT}/cpp/*.cpp)

add_library(OneLinuxCore STATIC ${RN_SOURCES} ${RN_LINUX_SOURCES} ${NITRO_SOURCES} ${WORKLETS_SOURCES} ${OPSQLITE_SOURCES} ${ONE_LINUX}/cpp/nitro/NitroLinuxPlatform.cpp)
target_link_libraries(OneLinuxCore PUBLIC PkgConfig::GTK4)

target_include_directories(OneLinuxCore PUBLIC
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
  ${ONE_LINUX}/cpp/textlayoutmanager
  ${NITRO_INCLUDE_DIRS}
  ${WORKLETS_ROOT}/Common/cpp
  ${ONE_LINUX}/cpp
  ${ONE_SHARED_HOST}
  ${RN_ROOT}/React/Fabric
  ${RC}/react/utils/platform/cxx
  ${RN_ROOT}/React/FBReactNativeSpec
)

target_compile_definitions(OneLinuxCore PUBLIC
  RCT_NEW_ARCH_ENABLED=1
  OP_SQLITE_USE_PHONE_VERSION=1
  WORKLETS_VERSION=${WORKLETS_VERSION}
  WORKLETS_FEATURE_FLAGS=${WORKLETS_FEATURE_FLAGS}
  HERMES_V1_ENABLED=1
  $<$<CONFIG:Debug>:HERMES_ENABLE_DEBUGGER=1>
  REACT_NATIVE_DEBUGGER_ENABLED=1
  REACT_NATIVE_DEBUGGER_ENABLED_DEVONLY=1
  $<$<CONFIG:Debug>:DEBUG=1>
)

# libstdc++ does not pull <cstdint> in transitively the way libc++ does, and some
# react-native headers use uint8_t and uint16_t without including it, and Nitro
# and worklets headers use std::unique_ptr, std::unordered_map and std::istream_iterator, and op-sqlite uses nullptr_t, the same way
target_compile_options(OneLinuxCore PRIVATE -iquote ${OPSQLITE_ROOT}/cpp "SHELL:-include cstdint" "SHELL:-include memory" "SHELL:-include unordered_map" "SHELL:-include iterator" "SHELL:-include algorithm" "SHELL:-include ${ONE_LINUX}/cpp/compat/OneLinuxStdCompat.h" -Wno-deprecated-declarations)

add_library(hermesvm SHARED IMPORTED)
set_target_properties(hermesvm PROPERTIES IMPORTED_LOCATION ${HERMES_ROOT}/lib/libhermesvm.so)

target_link_libraries(OneLinuxCore PUBLIC folly_runtime glog fmt double-conversion fast_float boost hermesvm Threads::Threads ${CMAKE_DL_LIBS})
find_package(Threads REQUIRED)

add_executable(one-linux-smoke ${CMAKE_CURRENT_LIST_DIR}/../smoke/main.cpp)
target_link_libraries(one-linux-smoke PRIVATE OneLinuxCore)
set_target_properties(one-linux-smoke PROPERTIES BUILD_RPATH ${HERMES_ROOT}/lib)

add_executable(one-linux
  ${ONE_LINUX}/host/main.cpp
  ${ONE_LINUX}/host/OneLinuxHost.cpp
  ${ONE_LINUX}/host/OneLinuxMountingManager.cpp
  ${ONE_LINUX}/host/OneLinuxModules.cpp
  ${ONE_LINUX}/host/OneLinuxNetwork.cpp
  ${ONE_LINUX}/host/OneLinuxNitro.cpp
  ${ONE_LINUX}/host/OneLinuxOpSqlite.cpp
  ${ONE_LINUX}/host/OneLinuxPointer.cpp
  ${ONE_LINUX}/host/OneLinuxRuntime.cpp
  ${ONE_LINUX}/host/OneLinuxStartup.cpp
  ${ONE_LINUX}/host/OneLinuxTextInput.cpp
  ${ONE_LINUX}/host/OneLinuxWorklets.cpp
  ${ONE_LINUX}/host/OneLinuxView.cpp
)
target_include_directories(one-linux PRIVATE ${ONE_LINUX}/host)
target_compile_options(one-linux PRIVATE -iquote ${OPSQLITE_ROOT}/cpp)
target_compile_options(one-linux PRIVATE -include cstdint -Wno-deprecated-declarations)
target_link_libraries(one-linux PRIVATE OneLinuxCore)
set_target_properties(one-linux PROPERTIES BUILD_RPATH ${HERMES_ROOT}/lib)
