import { Slot } from "one";
import { SchemeProvider, useUserScheme } from "@vxrn/color-scheme";
import { TamaguiProvider } from "tamagui";
import config from "~/config/tamagui.config";

export default function Layout() {
  return (
    <SchemeProvider>
      <TamaguiRootProvider>
        <Slot />
      </TamaguiRootProvider>
    </SchemeProvider>
  );
}

const TamaguiRootProvider = ({ children }: { children: React.ReactNode }) => {
  const userScheme = useUserScheme();

  return (
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={userScheme.value}>
      {children}
    </TamaguiProvider>
  );
};
