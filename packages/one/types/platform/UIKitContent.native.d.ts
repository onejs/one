import type { UICollectionView, UICollectionViewDiffableDataSource, UITableView, UITableViewDiffableDataSource } from 'one/ios/UIKit';
import type { UIKitContentProps } from './types';
export declare function UIKitContent({ onView, source, item, height, estimatedHeight, children, ...props }: UIKitContentProps): import("react").JSX.Element;
export declare function collectionCellSource(view: UICollectionView): Promise<UICollectionViewDiffableDataSource<number, number>>;
export declare function tableCellSource(view: UITableView): Promise<UITableViewDiffableDataSource<number, number>>;
//# sourceMappingURL=UIKitContent.native.d.ts.map