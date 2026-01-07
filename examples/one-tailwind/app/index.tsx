import { Text, View } from "react-native";
import "./base.css";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        alignSelf: "center",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100%",
        padding: 50,
        backgroundColor: "yellow",
      }}
    >
      <Text className="bg-red-500 p-4">Hello world, from One</Text>
    </View>
  );
}
