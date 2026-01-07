import { Tabs, TabList, TabSlot, TabTrigger } from "one/ui";
import { View, Text, StyleSheet } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs style={styles.container}>
      <TabSlot />
      <TabList style={styles.tabList}>
        <TabTrigger name="home" href="/tabs">
          <Text>Home</Text>
        </TabTrigger>
        <TabTrigger name="other" href="/tabs/other">
          <Text>Other</Text>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabList: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
  },
});
