import { redirect } from "one";
import { Text } from "tamagui";

export async function loader() {
  throw redirect("/loader");
}

export default function LoaderRedirectPage() {
  return <Text>This should never render - redirect should happen first</Text>;
}
