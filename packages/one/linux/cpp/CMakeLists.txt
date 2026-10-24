cmake_minimum_required(VERSION 3.22)
project(OneLinuxCore LANGUAGES C CXX)

# Compiles the platform neutral React Native C++ core from the app's installed
# react-native for Linux, with the cxx platform backends react-native ships for
# text layout and images, and the headless smoke binary. Inputs:
#   -DRN_ROOT=<path to node_modules/react-native>
#   -DHERMES_ROOT=<destroot prepare-hermes.sh wrote>
#   -DDEPS_CMAKE=<OneLinuxDeps.cmake from the deps build>
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

if(NOT RN_ROOT OR NOT HERMES_ROOT OR NOT DEPS_CMAKE)
  message(FATAL_ERROR "set RN_ROOT, HERMES_ROOT and DEPS_CMAKE")
endif()

include(${DEPS_CMAKE})
include(${CMAKE_CURRENT_LIST_DIR}/../../native-core/rn-core.cmake)

set(RN_LINUX_SOURCES
  ${RC}/react/renderer/textlayoutmanager/platform/cxx/react/renderer/textlayoutmanager/TextLayoutManager.cpp
  ${RC}/react/renderer/imagemanager/platform/cxx/react/renderer/imagemanager/ImageManager.cpp
)

add_library(OneLinuxCore STATIC ${RN_SOURCES} ${RN_LINUX_SOURCES})

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
  ${RC}/react/renderer/textlayoutmanager/platform/cxx
  ${RC}/react/utils/platform/cxx
  ${RN_ROOT}/React/FBReactNativeSpec
)

target_compile_definitions(OneLinuxCore PUBLIC
  RCT_NEW_ARCH_ENABLED=1
  HERMES_V1_ENABLED=1
  $<$<CONFIG:Debug>:HERMES_ENABLE_DEBUGGER=1>
  REACT_NATIVE_DEBUGGER_ENABLED=1
  REACT_NATIVE_DEBUGGER_ENABLED_DEVONLY=1
  $<$<CONFIG:Debug>:DEBUG=1>
)

# libstdc++ does not pull <cstdint> in transitively the way libc++ does, and some
# react-native headers use uint8_t and uint16_t without including it
target_compile_options(OneLinuxCore PRIVATE -include cstdint -Wno-deprecated-declarations)

add_library(hermesvm SHARED IMPORTED)
set_target_properties(hermesvm PROPERTIES IMPORTED_LOCATION ${HERMES_ROOT}/lib/libhermesvm.so)

target_link_libraries(OneLinuxCore PUBLIC folly_runtime glog fmt double-conversion fast_float boost hermesvm Threads::Threads ${CMAKE_DL_LIBS})
find_package(Threads REQUIRED)

add_executable(one-linux-smoke ${CMAKE_CURRENT_LIST_DIR}/../smoke/main.cpp)
target_link_libraries(one-linux-smoke PRIVATE OneLinuxCore)
set_target_properties(one-linux-smoke PROPERTIES BUILD_RPATH ${HERMES_ROOT}/lib)
