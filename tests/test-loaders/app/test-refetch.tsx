import { Suspense, useState, useEffect } from "react";
import { useLoaderState } from "one";
import { Text, YStack, Button } from "tamagui";

let callCount = 0;

export function loader() {
  callCount++;
  const timestamp = Date.now();
  console.log("[Test Refetch Loader] Called at:", timestamp, "Count:", callCount);
  return {
    timestamp,
    count: callCount,
  };
}

function LoaderContent() {
  const { data, refetch, state } = useLoaderState(loader);
  const [refetchCount, setRefetchCount] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleRefetch = async () => {
    console.log("[Test] Starting refetch...");
    setRefetchCount((c) => c + 1);
    await refetch();
    console.log("[Test] Refetch completed");
  };

  if (!data) {
    return <Text>Loading...</Text>;
  }

  return (
    <YStack gap="$4" p="$4">
      <Text fontSize="$6" fontWeight="bold">
        Loader Refetch Test
      </Text>

      <YStack gap="$2" backgroundColor="$gray2" padding="$3" borderRadius="$2">
        <Text>Timestamp: {isClient ? data.timestamp : "SSR"}</Text>
        <Text>Server Count: {data.count}</Text>
        <Text>Client Refetch Count: {refetchCount}</Text>
        <Text>State: {state}</Text>
      </YStack>

      <Button
        onPress={handleRefetch}
        disabled={state === "loading"}
        size="$5"
        theme={state === "loading" ? "gray" : "blue"}
      >
        {state === "loading" ? "Refetching..." : "Refetch Loader"}
      </Button>

      <Text fontSize="$2" color="$gray10">
        Open console to see loader calls
      </Text>
    </YStack>
  );
}

export default function TestRefetchPage() {
  return (
    <Suspense fallback={<Text>Loading page...</Text>}>
      <LoaderContent />
    </Suspense>
  );
}
