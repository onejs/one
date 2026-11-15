import 'one/ios/UIKit/UIWindow';
import 'one/ios/UIKit/UIViewController';
import 'one/ios/UIKit/UIView';
import 'one/ios/UIKit/UIPopoverPresentationController';
import type { ShareItem, ShareResult } from '../specs/OneShare.nitro.js';
declare function share(items: ShareItem[]): Promise<ShareResult>;
export declare function shareNative(): {
    share: typeof share;
};
export {};
//# sourceMappingURL=backend.sdk.d.ts.map