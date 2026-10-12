#import <Foundation/Foundation.h>

#include "OneStorageDirectory.hpp"

#include <stdexcept>

namespace margelo::nitro::one {

std::string storageDirectory() {
  @autoreleasepool {
    NSFileManager* files = NSFileManager.defaultManager;
    NSError* error = nil;
    NSURL* support = [files URLForDirectory:NSApplicationSupportDirectory
                                   inDomain:NSUserDomainMask
                          appropriateForURL:nil
                                     create:YES
                                      error:&error];
    NSURL* directory = [support URLByAppendingPathComponent:@"One" isDirectory:YES];
    if (support == nil ||
        ![files createDirectoryAtURL:directory withIntermediateDirectories:YES attributes:nil error:&error]) {
      throw std::runtime_error(
          std::string("E_STORAGE_OPEN: Storage: ") + error.localizedDescription.UTF8String);
    }
    return directory.fileSystemRepresentation;
  }
}

} // namespace margelo::nitro::one
