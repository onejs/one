cmake_minimum_required(VERSION 3.22)
project(OneWindowsDeps LANGUAGES C CXX)

# Builds folly, glog, fmt, double-conversion and fast_float for Windows from the
# sources prepare-deps.ps1 laid out. double-conversion, fmt and fast_float use
# the CMake files react-native's Android build uses. glog uses its own CMake
# build, which carries its Windows port; the Android one compiles the POSIX
# signal handler and an Android config.h. folly compiles the runtime units
# react-native's Android build lists, without its Android and libc++ flags,
# plus folly's own Windows portability units. boost is headers only. Writes
# OneWindowsDeps.cmake to the build directory for the core to include.
#   -DTP_ROOT=<directory prepare-deps.ps1 filled>
if(NOT TP_ROOT)
  message(FATAL_ERROR "set TP_ROOT")
endif()

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(REACT_COMMON_DIR ${CMAKE_CURRENT_LIST_DIR})

file(GLOB boost_root LIST_DIRECTORIES true ${TP_ROOT}/boost/boost_*)
add_library(boost INTERFACE)
target_include_directories(boost INTERFACE ${boost_root})

add_subdirectory(${TP_ROOT}/double-conversion double-conversion)
add_subdirectory(${TP_ROOT}/fast_float fast_float)
add_subdirectory(${TP_ROOT}/fmt fmt)

set(WITH_GFLAGS OFF CACHE BOOL "" FORCE)
set(BUILD_TESTING OFF CACHE BOOL "" FORCE)
set(BUILD_SHARED_LIBS OFF)
add_subdirectory(${TP_ROOT}/glog glog EXCLUDE_FROM_ALL)
# consumers see glog's public headers, laid out as an installed glog has them:
# the ones it configures into its build directory plus log_severity.h. Its
# build interface also exports its private src directories, whose demangle.h
# folly takes for libiberty's.
configure_file(${TP_ROOT}/glog/src/glog/log_severity.h ${CMAKE_CURRENT_BINARY_DIR}/glog/glog/log_severity.h COPYONLY)
set_target_properties(glog PROPERTIES INTERFACE_INCLUDE_DIRECTORIES "$<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/glog>")

set(F ${TP_ROOT}/folly/folly)
add_library(folly_runtime STATIC
  # react-native's folly_runtime
  ${F}/Conv.cpp
  ${F}/Demangle.cpp
  ${F}/FileUtil.cpp
  ${F}/Format.cpp
  ${F}/ScopeGuard.cpp
  ${F}/SharedMutex.cpp
  ${F}/String.cpp
  ${F}/Unicode.cpp
  ${F}/concurrency/CacheLocality.cpp
  ${F}/container/detail/F14Table.cpp
  ${F}/detail/FileUtilDetail.cpp
  ${F}/detail/Futex.cpp
  ${F}/detail/SplitStringSimd.cpp
  ${F}/detail/UniqueInstance.cpp
  ${F}/hash/SpookyHashV2.cpp
  ${F}/json/dynamic.cpp
  ${F}/json/json_pointer.cpp
  ${F}/json/json.cpp
  ${F}/lang/CString.cpp
  ${F}/lang/Exception.cpp
  ${F}/lang/SafeAssert.cpp
  ${F}/lang/ToAscii.cpp
  ${F}/memory/detail/MallocImpl.cpp
  ${F}/net/NetOps.cpp
  ${F}/portability/SysUio.cpp
  ${F}/synchronization/SanitizeThread.cpp
  ${F}/synchronization/ParkingLot.cpp
  ${F}/system/AtFork.cpp
  ${F}/system/ThreadId.cpp
  # folly's Windows implementations of the POSIX calls those units make
  ${F}/net/detail/SocketFileDescriptorMap.cpp
  ${F}/portability/Fcntl.cpp
  ${F}/portability/Sockets.cpp
  ${F}/portability/Stdio.cpp
  ${F}/portability/Stdlib.cpp
  ${F}/portability/String.cpp
  ${F}/portability/SysFile.cpp
  ${F}/portability/SysMman.cpp
  ${F}/portability/SysStat.cpp
  ${F}/portability/SysTime.cpp
  ${F}/portability/Time.cpp
  ${F}/portability/Unistd.cpp
)
# the definitions react-native compiles folly with on every platform; the POSIX
# feature switches and FOLLY_USE_LIBCPP of the Android list do not apply to the
# MSVC STL
target_compile_definitions(folly_runtime PUBLIC
  FOLLY_NO_CONFIG=1
  FOLLY_CFG_NO_COROUTINES=1
  FOLLY_MOBILE=1
)
target_compile_options(folly_runtime PRIVATE -Wno-sign-compare)
target_include_directories(folly_runtime PUBLIC ${TP_ROOT}/folly)
target_link_libraries(folly_runtime PUBLIC glog double-conversion boost fmt fast_float ws2_32)

export(TARGETS boost double-conversion fast_float fmt glog folly_runtime FILE ${CMAKE_BINARY_DIR}/OneWindowsDeps.cmake)
