import { Stack, usePathname } from "expo-router";
import { useEffect } from "react";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import '@/global.css'
import { posthog } from "@/lib/posthog";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";


function RouteTracker() {
  const pathname = usePathname();
  const posthogClient = usePostHog();

  useEffect(() => {
    posthogClient.screen(pathname);
  }, [pathname, posthogClient]);

  return null;
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error('Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env to enable authentication.');
  }
  const app = (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <Stack screenOptions={{ headerShown: false }} />
    </ClerkProvider>
  );

  if (!posthog) {
    return app;
  }

  return (
    <PostHogProvider
      client={posthog}
      autocapture={{ captureScreens: false }}
    >
      <RouteTracker />
      {app}
    </PostHogProvider>
  );
}
