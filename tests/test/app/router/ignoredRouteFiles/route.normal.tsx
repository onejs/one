import { View, Text } from "react-native";

export default function Route() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text
        testID="ignoredRouteFiles-route-normal"
        style={{ color: "black", backgroundColor: "white" }}
      >
        This is a normal route.
      </Text>
    </View>
  );
}
