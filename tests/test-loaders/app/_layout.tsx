import { SchemeProvider, useUserScheme } from "@vxrn/color-scheme";
import { Slot } from "one";
import { TamaguiProvider } from "tamagui";
import config from "../config/tamagui.config";

export default function Layout() {
  return (
    <html lang="ab">
      <SchemeProvider>
        <TamaguiRootProvider>
          <Slot />
        </TamaguiRootProvider>
      </SchemeProvider>
    </html>
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
