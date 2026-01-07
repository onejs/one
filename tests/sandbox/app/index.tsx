import { Text, View } from "react-native";
import WebView from "react-native-webview";

export default () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <Text>Welcome to VXS</Text>
    <Text>Welcome to VXS</Text>
    <Text>Welcome to VXS</Text>
    <Text>Welcome to VXS</Text>

    <View style={{ width: "100%", height: 500, backgroundColor: "green" }}>
      <WebView
        style={{
          flex: 1,
          width: "100%",
          backgroundColor: "red",
          height: "100%",
          minHeight: 200,
          minWidth: 200,
        }}
        source={{ html: "<h1>Hello world</h1>" }}
        originWhitelist={["*"]}
      />
    </View>
  </View>
);
