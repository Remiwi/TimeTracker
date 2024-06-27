import "./global.css";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Drawer } from "expo-router/drawer";

const qc = new QueryClient();

import { GestureHandlerRootView } from "react-native-gesture-handler";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={qc}>
        <ThemeProvider value={DefaultTheme}>
          <Drawer
            screenOptions={{
              headerShown: true,
              swipeEdgeWidth: 200,
              headerStyle: {
                borderBottomWidth: 1,
                borderColor: "#f0f0f0",
              },
            }}
          >
            <Drawer.Screen
              name="index"
              options={{
                drawerLabel: "Timer",
                headerTitle: "Timer",
              }}
            />
            <Drawer.Screen
              name="projects"
              options={{
                drawerLabel: "Projects",
                headerTitle: "Projects",
              }}
            />
            <Drawer.Screen
              name="+not-found"
              options={{
                drawerItemStyle: { display: "none" },
              }}
            />
          </Drawer>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
