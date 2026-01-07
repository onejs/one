import { Suspense, useState, useEffect } from "react";
import { useLoaderState } from "one";
import { Button, Text, YStack } from "tamagui";

export function loader() {
  // Use timestamp and random to verify refetch
  const now = Date.now();
  const rand = Math.random();
  console.log("[Simple Loader] Called at:", now, "Random:", rand);
  return {
    timestamp: now,
    random: rand,
  };
}

function LoaderContent() {
  const { data, refetch, state } = useLoaderState(loader);
  const [initialData, setInitialData] = useState<any>(null);
  const [hasChanged, setHasChanged] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Capture initial data after first load (client-side only)
  useEffect(() => {
    setIsClient(true);
    if (data) {
      if (!initialData) {
        setInitialData(data);
      } else if (data.timestamp !== initialData.timestamp) {
        setHasChanged(true);
      }
    }
  }, [data, initialData]);

  // Guard against undefined data during initial load
  if (!data) {
    return <Text>Loading initial data...</Text>;
  }

  return (
    <YStack gap="$4" p="$4">
      <Text id="timestamp">Timestamp: {isClient ? data.timestamp : "loading"}</Text>
      <Text id="random">Random: {isClient ? data.random : "loading"}</Text>
      <Text id="state">State: {state}</Text>
      <Text id="changed">Changed: {hasChanged ? "YES" : "NO"}</Text>

      <button
        id="refetch-btn"
        onClick={refetch}
        disabled={state === "loading"}
        style={{ padding: 10, fontSize: 16 }}
      >
        {state === "loading" ? "Loading..." : "Refetch"}
      </button>
    </YStack>
  );
}

export default () => {
  return (
    <Suspense fallback={<Text>Loading...</Text>}>
      <LoaderContent />
    </Suspense>
  );
};
