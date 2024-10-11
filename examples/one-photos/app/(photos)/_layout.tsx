import { isWeb, View } from "tamagui";
import { Slot, Stack } from "one";
import { ToggleThemeButton } from "~/code/theme/ToggleThemeButton";

export default function FeedLayout() {
  return (
    <View flex={1}>
      {isWeb ? (
        <Slot />
      ) : (
        <Stack
          screenOptions={{
            headerRight() {
              return (
                <View px="$2">
                  <ToggleThemeButton />
                </View>
              );
            },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: "Photos",
            }}
          />
          <Stack.Screen name="photo/[id]" options={{ title: "Photo" }} />
        </Stack>
      )}
    </View>
  );
}
