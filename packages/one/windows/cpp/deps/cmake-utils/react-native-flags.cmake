# stands in for ReactCommon/cmake-utils/react-native-flags.cmake while building
# react-native's own third party CMake files with clang-cl: the same definitions.
# Exceptions, RTTI and C++20 come from CMake's clang-cl defaults and
# CMAKE_CXX_STANDARD, and -Wall -Werror stay out as on Linux.
function(target_compile_reactnative_options target_name scope)
  target_compile_definitions(${target_name} ${scope} FOLLY_NO_CONFIG=1 LOG_TAG="ReactNative" HERMES_V1_ENABLED=1)
endfunction()
