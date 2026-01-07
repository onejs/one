import { Text, View } from "react-native";
import { useLoader } from "one";

// This loader uses @vxrn/mdx via dynamic import
// The clientTreeShakePlugin should remove this loader
// and dead-code elimination should remove the @vxrn/mdx import
export async function loader() {
  const { getAllFrontmatter } = await import("@vxrn/mdx");
  const frontmatters = getAllFrontmatter("data");
  return {
    count: frontmatters.length,
  };
}

export default function HomePage() {
  const data = useLoader(loader);

  return (
    <View
      style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "pink" }}
    >
      <Text style={{ color: "red" }}>Home Page</Text>
      <Text style={{ color: "red" }}>Frontmatter count: {data?.count ?? 0}</Text>
    </View>
  );
}
