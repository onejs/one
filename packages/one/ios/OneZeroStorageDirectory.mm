#import <Foundation/Foundation.h>

#include "OneStorageDirectory.hpp"
#include <stdexcept>

namespace margelo::nitro::one {

std::string zeroStorageDirectory() {
  @autoreleasepool {
    NSURL *parent = [NSURL fileURLWithFileSystemRepresentation:storageDirectory().c_str()
                                                   isDirectory:YES
                                                 relativeToURL:nil];
    NSURL *directory = [parent URLByAppendingPathComponent:@"zero" isDirectory:YES];
    NSError *error = nil;
    if (![NSFileManager.defaultManager createDirectoryAtURL:directory
                                withIntermediateDirectories:YES
                                                 attributes:nil
                                                      error:&error] ||
        ![directory setResourceValue:@YES forKey:NSURLIsExcludedFromBackupKey error:&error]) {
      throw std::runtime_error(std::string("E_ZERO_STORAGE_OPEN: ") +
                               error.localizedDescription.UTF8String);
    }
    return directory.fileSystemRepresentation;
  }
}

}  // namespace margelo::nitro::one
