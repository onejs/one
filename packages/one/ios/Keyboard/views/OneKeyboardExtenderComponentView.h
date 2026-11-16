//
//  KeyboardExtenderManager.h
//  KeyboardController
//
//  Created by Kiryl Ziusko on 13.04.25.
//  Copyright © 2025 Facebook. All rights reserved.
//
#import <React/RCTViewComponentView.h>
#import <UIKit/UIKit.h>


@interface OneKeyboardExtenderComponentView :
    RCTViewComponentView
@property (nonatomic, assign) BOOL enabled;
@property (nonatomic, assign) BOOL transparent;
@end
