import { NativeTabs } from "~/code/ui/BottomTabs.native";

export function HomeLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: () => ({ sfSymbol: "newspaper" }),
        }}
      />

      <NativeTabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: () => ({ sfSymbol: "bell" }),
        }}
      />

      <NativeTabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: () => ({ sfSymbol: "person" }),
        }}
      />
    </NativeTabs>
  );
}
