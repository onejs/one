import { Suspense, useState, useEffect } from "react";
import { useLoaderState } from "one";
import { Text, YStack, Button } from "tamagui";

let callCount = 0;

export function loader() {
  callCount++;
  const timestamp = Date.now();
  console.log("[SSR Test Refetch Loader] Called at:", timestamp, "Count:", callCount);
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
    console.log("[SSR Test] Starting refetch...");
    setRefetchCount((c) => c + 1);
    await refetch();
    console.log("[SSR Test] Refetch completed");
  };

  if (!data) {
    return <Text>Loading...</Text>;
  }

  return (
    <YStack gap="$4" p="$4">
      <Text fontSize="$6" fontWeight="bold">
        SSR Loader Refetch Test
      </Text>

      <YStack gap="$2" backgroundColor="$gray2" padding="$3" borderRadius="$2">
        <Text>Timestamp: {isClient ? data.timestamp : "SSR"}</Text>
        <Text>Server Count: {data.count}</Text>
        <Text>Client Refetch Count: {refetchCount}</Text>
        <Text>State: {state}</Text>
        <Text color="$green10">Mode: SSR</Text>
      </YStack>

      <Button
        onPress={handleRefetch}
        disabled={state === "loading"}
        size="$5"
        theme={state === "loading" ? "gray" : "blue"}
      >
        {state === "loading" ? "Refetching..." : "Refetch SSR Loader"}
      </Button>

      <Text fontSize="$2" color="$gray10">
        This page uses SSR - loaders run on each request
      </Text>
    </YStack>
  );
}

export default function TestRefetchSSRPage() {
  return (
    <Suspense fallback={<Text>Loading page...</Text>}>
      <LoaderContent />
    </Suspense>
  );
}
