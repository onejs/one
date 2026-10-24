# stands in for ReactCommon/cmake-utils/react-native-flags.cmake while building
# react-native's own third party CMake files on Linux: the same flags, without
# -Wall -Werror, which would fail the build on compilers react-native does not test.
set(reactnative_FLAGS
  -fexceptions
  -frtti
  -std=c++20
  -DFOLLY_NO_CONFIG=1
  -DLOG_TAG=\"ReactNative\"
)

function(target_compile_reactnative_options target_name scope)
  target_compile_options(${target_name} ${scope} ${reactnative_FLAGS})
  target_compile_definitions(${target_name} ${scope} HERMES_V1_ENABLED=1)
endfunction()
