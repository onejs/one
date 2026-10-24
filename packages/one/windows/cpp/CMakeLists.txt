cmake_minimum_required(VERSION 3.22)
project(OneWindowsCore LANGUAGES C CXX)

# Compiles the platform neutral React Native C++ core from the app's installed
# react-native for Windows with clang-cl and the MSVC STL, with the cxx platform
# backends react-native ships for text layout and images, and the headless smoke
# binary. The unit list and the host runtime are the shared native-core ones.
# Inputs:
#   -DRN_ROOT=<path to node_modules/react-native>
#   -DNATIVE_CORE=<path to packages/one/native-core>
#   -DHERMES_ROOT=<destroot prepare-hermes.ps1 wrote>
#   -DDEPS_CMAKE=<OneWindowsDeps.cmake from the deps build>
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

if(NOT RN_ROOT OR NOT NATIVE_CORE OR NOT HERMES_ROOT OR NOT DEPS_CMAKE)
  message(FATAL_ERROR "set RN_ROOT, NATIVE_CORE, HERMES_ROOT and DEPS_CMAKE")
endif()

include(${DEPS_CMAKE})
include(${NATIVE_CORE}/rn-core.cmake)

set(ONE_WINDOWS ${CMAKE_CURRENT_LIST_DIR}/..)
set(ONE_SHARED_HOST ${NATIVE_CORE}/host)
file(GLOB ONE_SHARED_HOST_SOURCES ${ONE_SHARED_HOST}/*.cpp)

# rn-core.cmake leaves out every *Windows.cpp unit; OSCompatWindows.cpp is the
# Windows implementation of oscompat, and OSCompatPosix.cpp compiles to nothing
# here
set(RN_WINDOWS_SOURCES
  ${RC}/oscompat/OSCompatWindows.cpp
  ${RC}/react/renderer/textlayoutmanager/platform/cxx/react/renderer/textlayoutmanager/TextLayoutManager.cpp
  ${RC}/react/renderer/imagemanager/platform/cxx/react/renderer/imagemanager/ImageManager.cpp
  ${ONE_SHARED_HOST_SOURCES}
)

add_library(OneWindowsCore STATIC ${RN_SOURCES} ${RN_WINDOWS_SOURCES})

target_include_directories(OneWindowsCore PUBLIC
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
  ${ONE_SHARED_HOST}
  ${CMAKE_CURRENT_LIST_DIR}
  ${RC}/react/utils/platform/cxx
  ${RN_ROOT}/React/FBReactNativeSpec
)

# NOMINMAX and WIN32_LEAN_AND_MEAN keep windows.h from defining min, max and
# the rarely used APIs over the core's own names, and _USE_MATH_DEFINES gives
# the MSVC C runtime's math.h M_PI
target_compile_definitions(OneWindowsCore PUBLIC
  RCT_NEW_ARCH_ENABLED=1
  HERMES_V1_ENABLED=1
  $<$<CONFIG:Debug>:HERMES_ENABLE_DEBUGGER=1>
  REACT_NATIVE_DEBUGGER_ENABLED=1
  REACT_NATIVE_DEBUGGER_ENABLED_DEVONLY=1
  $<$<CONFIG:Debug>:DEBUG=1>
  NOMINMAX
  WIN32_LEAN_AND_MEAN
  _USE_MATH_DEFINES
)

add_library(hermesvm SHARED IMPORTED)
set_target_properties(hermesvm PROPERTIES
  IMPORTED_IMPLIB ${HERMES_ROOT}/lib/hermesvm.lib
  IMPORTED_LOCATION ${HERMES_ROOT}/bin/hermesvm.dll)

target_link_libraries(OneWindowsCore PUBLIC folly_runtime glog fmt double-conversion fast_float boost hermesvm)

add_executable(one-windows-smoke ${ONE_WINDOWS}/smoke/main.cpp)
target_link_libraries(one-windows-smoke PRIVATE OneWindowsCore)
add_custom_command(TARGET one-windows-smoke POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E copy_if_different ${HERMES_ROOT}/bin/hermesvm.dll $<TARGET_FILE_DIR:one-windows-smoke>)

# the window island prototype's runtime, built only when its target is named
add_subdirectory(${ONE_WINDOWS}/island/runtime ${CMAKE_CURRENT_BINARY_DIR}/island EXCLUDE_FROM_ALL)
