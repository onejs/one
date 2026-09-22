#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

// imperative image picker: the system photo picker for the library and the
// system camera for captures. PHPickerViewController needs no permission
// prompt; the camera needs NSCameraUsageDescription, which one prebuild
// writes from native.app imagePicker. picked assets are copied into the app
// cache and returned as file uris. backing out, a denied permission, and a
// missing camera all resolve { canceled: true, assets: null }; only runtime
// failures reject, with E_IMAGE_PICKER_FAILED.
@interface OneNativeImagePicker : NSObject <RCTBridgeModule>

@end
