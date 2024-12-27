import { type DocumentTitleOptions, type LinkingOptions, type LocaleDirection, type NavigationContainerProps, type NavigationContainerRef, type Theme } from '@react-navigation/native';
import * as React from 'react';
type Props<ParamList extends object> = NavigationContainerProps & {
    direction?: LocaleDirection;
    documentTitle?: DocumentTitleOptions;
    fallback?: React.ReactNode;
    linking?: LinkingOptions<ParamList>;
    onReady?: () => void;
    theme?: Theme;
};
declare const NavigationContainer: <RootParamList extends object = ReactNavigation.RootParamList>(props: Props<RootParamList> & {
    ref?: React.Ref<NavigationContainerRef<RootParamList>>;
}) => React.ReactElement;
export default NavigationContainer;
//# sourceMappingURL=NavigationContainer.d.ts.map