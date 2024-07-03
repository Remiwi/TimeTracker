import "./global.css";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { qc } from "@/apis/queryclient";
import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Data } from "@/apis/data";
import NetInfo from "@react-native-community/netinfo";

const prevState = {
  isConnected: false as boolean | null,
};
setInterval(
  async () =>
    await NetInfo.fetch().then(async (state) => {
      if (state.isConnected && !prevState.isConnected) {
        console.log("Syncing");
        let i = 0;
        while (i < 3) {
          try {
            await Data.Projects.sync();
            i = 3;
          } catch (e) {
            console.error(e);
            i++;
          }
        }
      }
      prevState.isConnected = state.isConnected;
    }),
  10_000,
);

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
              name="settings"
              options={{
                drawerLabel: "Settings",
                headerTitle: "Settings",
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
