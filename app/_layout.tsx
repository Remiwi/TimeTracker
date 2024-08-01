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
import { QueryClientProvider } from "@tanstack/react-query";
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
            await Data.Sync.sync();
            i = 3;
          } catch (e) {
            console.error(e);
            i++;
          }
        }
      }
      prevState.isConnected = state.isConnected;
    }),
  1_000,
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
              swipeEnabled: false,
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
              name="activity"
              options={{
                drawerLabel: "Activity",
                headerTitle: "Activity",
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
              name="reports/index"
              options={{
                drawerLabel: "Reports",
                headerTitle: "Reports",
                drawerItemStyle: { display: "none" },
              }}
            />
            <Drawer.Screen
              name="reports/[id]"
              options={{
                headerTitle: "Report Config",
                drawerItemStyle: { display: "none" },
              }}
            />
            <Drawer.Screen
              name="groups/[id]"
              options={{
                headerTitle: "Group Config",
                drawerItemStyle: { display: "none" },
                headerShown: false,
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
