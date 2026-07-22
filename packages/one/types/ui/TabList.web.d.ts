import type { ComponentProps, HTMLAttributes, ReactElement } from 'react';
export type TabListProps = HTMLAttributes<HTMLElement> & {
    /** Forward props to child component and removes the extra `<nav>`. Useful for custom wrappers. */
    asChild?: boolean;
};
export declare function TabList({ asChild, ...props }: TabListProps): import("react/jsx-runtime").JSX.Element;
/**
 * @hidden
 */
export declare function isTabList(child: ReactElement<any>): child is ReactElement<ComponentProps<typeof TabList>>;
//# sourceMappingURL=TabList.web.d.ts.map