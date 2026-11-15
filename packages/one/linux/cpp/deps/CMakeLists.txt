cmake_minimum_required(VERSION 3.22)
project(OneLinuxDeps LANGUAGES C CXX)

# Builds folly, glog, fmt, double-conversion and fast_float from the sources
# prepare-deps.sh laid out, with the CMake files react-native's Android build
# uses. boost is headers only: its CMake file only adds assembly for Android
# ABIs, which folly's futures need and the core does not use. Writes
# OneLinuxDeps.cmake to the build directory for the core to include.
#   -DTP_ROOT=<directory prepare-deps.sh filled>
if(NOT TP_ROOT)
  message(FATAL_ERROR "set TP_ROOT")
endif()

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(REACT_COMMON_DIR ${CMAKE_CURRENT_LIST_DIR})

file(GLOB boost_root LIST_DIRECTORIES true ${TP_ROOT}/boost/boost_*)
add_library(boost INTERFACE)
target_include_directories(boost INTERFACE ${boost_root})

add_subdirectory(${TP_ROOT}/double-conversion double-conversion)
add_subdirectory(${TP_ROOT}/fast_float fast_float)
add_subdirectory(${TP_ROOT}/fmt fmt)
add_subdirectory(${TP_ROOT}/glog glog)
add_subdirectory(${TP_ROOT}/folly folly)

export(TARGETS boost double-conversion fast_float fmt glog folly_runtime FILE ${CMAKE_BINARY_DIR}/OneLinuxDeps.cmake)
