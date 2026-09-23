if(NOT TARGET ReactAndroid::hermestooling)
add_library(ReactAndroid::hermestooling SHARED IMPORTED)
set_target_properties(ReactAndroid::hermestooling PROPERTIES
    IMPORTED_LOCATION "/Users/n8/.gradle/caches/9.4.1/transforms/2f3f04f29a7d86f4d7cc17e86688042f/transformed/react-android-0.87.1-debug/prefab/modules/hermestooling/libs/android.x86/libhermestooling.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/n8/.gradle/caches/9.4.1/transforms/2f3f04f29a7d86f4d7cc17e86688042f/transformed/react-android-0.87.1-debug/prefab/modules/hermestooling/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::jsi)
add_library(ReactAndroid::jsi SHARED IMPORTED)
set_target_properties(ReactAndroid::jsi PROPERTIES
    IMPORTED_LOCATION "/Users/n8/.gradle/caches/9.4.1/transforms/2f3f04f29a7d86f4d7cc17e86688042f/transformed/react-android-0.87.1-debug/prefab/modules/jsi/libs/android.x86/libjsi.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/n8/.gradle/caches/9.4.1/transforms/2f3f04f29a7d86f4d7cc17e86688042f/transformed/react-android-0.87.1-debug/prefab/modules/jsi/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::reactnative)
add_library(ReactAndroid::reactnative SHARED IMPORTED)
set_target_properties(ReactAndroid::reactnative PROPERTIES
    IMPORTED_LOCATION "/Users/n8/.gradle/caches/9.4.1/transforms/2f3f04f29a7d86f4d7cc17e86688042f/transformed/react-android-0.87.1-debug/prefab/modules/reactnative/libs/android.x86/libreactnative.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/n8/.gradle/caches/9.4.1/transforms/2f3f04f29a7d86f4d7cc17e86688042f/transformed/react-android-0.87.1-debug/prefab/modules/reactnative/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

