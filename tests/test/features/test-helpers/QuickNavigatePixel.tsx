import { useCallback } from "react";
import { Pressable } from "react-native";
import { useRouter } from "one";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets, initialWindowMetrics } from "react-native-safe-area-context";

export function QuickNavigatePixel() {
  const safeAreaInsets = (() => {
    try {
      const insets = useSafeAreaInsets();
      if (insets) return insets;
    } catch {}

    // Fallback so this component will still work even if the safe area context is not available
    // or broken.
    return initialWindowMetrics?.insets;
  })();

  const router = useRouter();

  const navigate = useCallback(async () => {
    try {
      const target = await Clipboard.getStringAsync();

      if (!target) {
        console.warn("QuickNavigatePixel: Nothing in clipboard");
        return;
      }

      router.navigate(target as any);
    } catch (e) {
      console.warn(
        `QuickNavigatePixel: Failed to navigate ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  }, []);

  return (
    <Pressable
      testID="quick-navigate-pixel"
      style={{
        position: "absolute",

        // Need to be in the safe area to be tappable
        bottom: (safeAreaInsets?.bottom || 0) + 1,
        right: (safeAreaInsets?.right || 0) + 1,

        // Need to be big enough, otherwise appium selector will not be able to find it
        width: 5,
        height: 5,

        // Make it visible for debugging
        // backgroundColor: 'green',
      }}
      onPress={navigate}
    ></Pressable>
  );
}
