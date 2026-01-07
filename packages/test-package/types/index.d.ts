import { type ColorSchemeName } from "@vxrn/universal-color-scheme";
export type Scheme = "light" | "dark";
export type SchemeSetting = "system" | "light" | "dark";
export { getColorScheme, onColorSchemeChange } from "@vxrn/universal-color-scheme";
export declare const clearColorSchemeSetting: () => void;
export declare const useColorScheme: () => readonly ["light" | "dark", typeof setSchemeSetting];
export declare function useSchemeSetting(): readonly [
  {
    setting: SchemeSetting;
    scheme: "light" | "dark";
  },
  typeof setSchemeSetting,
];
export declare function setSchemeSetting(next: SchemeSetting): void;
export declare function SchemeProvider({
  children,
  getClassName,
}: {
  children: any;
  getClassName?: (name: ColorSchemeName) => string;
}): import("react/jsx-runtime").JSX.Element;
export declare const MetaTheme: ({
  color,
  darkColor,
  lightColor,
}: {
  color: string;
  darkColor: string;
  lightColor: string;
}) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=index.d.ts.map
