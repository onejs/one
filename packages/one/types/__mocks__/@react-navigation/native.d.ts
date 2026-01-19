export declare const useNavigation: () => {
    navigate: () => void;
    goBack: () => void;
    setOptions: () => void;
    getParent: () => null;
};
export declare const NavigationContainer: ({ children }: any) => any;
export type NavigationProp<T = any> = {
    navigate: (route: string, params?: any) => void;
    goBack: () => void;
    setOptions: (options: any) => void;
    getParent: (id?: string) => any;
};
export type ParamListBase = Record<string, object | undefined>;
export type StackNavigationState<T> = any;
export type EventMapBase = any;
//# sourceMappingURL=native.d.ts.map