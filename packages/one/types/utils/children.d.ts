import { type JSXElementConstructor, type ReactElement, type ReactNode } from 'react';
/**
 * Type-safe check if a React element is of a specific component type.
 * Used for filtering children in compositional APIs.
 */
export declare function isChildOfType<ComponentT extends JSXElementConstructor<any>>(element: ReactNode, type: ComponentT): element is ReactElement<React.ComponentProps<ComponentT>, ComponentT>;
/**
 * Get the first child element of a specific type.
 */
export declare function getFirstChildOfType<ComponentT extends JSXElementConstructor<any>>(children: ReactNode, type: ComponentT): ReactElement<React.ComponentProps<ComponentT>, ComponentT> | undefined;
/**
 * Get all children of a specific type.
 */
export declare function getAllChildrenOfType<ComponentT extends JSXElementConstructor<any>>(children: ReactNode, type: ComponentT): ReactElement<React.ComponentProps<ComponentT>, ComponentT>[];
//# sourceMappingURL=children.d.ts.map