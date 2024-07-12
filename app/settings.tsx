import * as SecureStore from "expo-secure-store";
import StyledTextInput from "@/components/TextInput";
import { useEffect, useState } from "react";
import { Text, TouchableNativeFeedback, View } from "react-native";
import { Toggl, TogglConfig } from "@/apis/toggl";
import Database from "@/apis/db";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MyDropDown from "@/components/DropDown";
import { Workspace } from "@/apis/types";

export default function Page() {
  const qc = useQueryClient();

  const [togglToken, setTogglToken] = useState<string>("");
  const [tokenEntered, setTokenEntered] = useState<boolean>(false);
  const setTokenEnteredTrue = () => {
    setTokenEntered(true);
    setTimeout(() => {
      setTokenEntered(false);
    }, 3000);
  };

  const workspaces = useQuery({
    queryKey: ["workspaces"],
    queryFn: Toggl.Me.getWorkspaces,
  });

  const [togglWorkspace, setTogglWorkspace] = useState<Workspace | null>(null);
  const [workspaceEntered, setWorkspaceEntered] = useState<boolean>(false);
  const setWorkspaceEnteredTrue = () => {
    setWorkspaceEntered(true);
    setTimeout(() => {
      setWorkspaceEntered(false);
    }, 3000);
  };

  useEffect(() => {
    const current_ws = Number(SecureStore.getItem("togglWorkspace"));
    const ws = workspaces.data?.find((w) => w.id === current_ws);
    if (ws) {
      setTogglWorkspace(ws);
      return;
    }
    if (workspaces.data?.length === 1) {
      setTogglWorkspace(workspaces.data[0]);
      SecureStore.setItem("togglWorkspace", workspaces.data[0].id.toString());
    }
  }, [workspaces.data]);

  return (
    <View>
      <View className="p-4">
        <StyledTextInput
          label="Toggl Token"
          bgColor="white"
          value={togglToken}
          onChange={setTogglToken}
        />
        <View className="flex w-full flex-row justify-end pt-4">
          {tokenEntered && (
            <View className="flex flex-grow justify-center">
              <Text>Token entered</Text>
            </View>
          )}
          <View className="overflow-hidden rounded-full">
            <TouchableNativeFeedback
              onPress={() => {
                if (togglToken === "") return;
                SecureStore.setItem("togglToken", togglToken);
                TogglConfig.token = togglToken;
                setTogglToken("");
                setTokenEnteredTrue();
                workspaces.refetch();
              }}
            >
              <View className="flex w-28 items-center justify-center rounded-full bg-slate-200 p-2">
                <Text className="text-lg">Enter</Text>
              </View>
            </TouchableNativeFeedback>
          </View>
        </View>
      </View>
      <View className="p-4 pb-8">
        <MyDropDown
          label="Toggl Workspace"
          options={workspaces.data || []}
          itemToString={(item) => item?.name || ""}
          modalColor="#eeeeee"
          value={togglWorkspace}
          onChange={(w) => {
            if (!w) return;
            setTogglWorkspace(w);
            SecureStore.setItem("togglWorkspace", w.id.toString());
            setWorkspaceEnteredTrue();
          }}
        />
        <View className="flex w-full flex-row justify-end pt-4">
          {workspaceEntered && (
            <View className="flex flex-grow justify-center">
              <Text>Token entered</Text>
            </View>
          )}
        </View>
      </View>
      <View className="flex w-full items-center">
        <View className="overflow-hidden rounded-full">
          <TouchableNativeFeedback
            onPress={() => {
              Database.Manage.dropAllTablesSync();
              Database.Manage.intializeDBSync();
              SecureStore.deleteItemAsync("togglToken");
              SecureStore.deleteItemAsync("togglWorkspace");
              TogglConfig.token = "";
              TogglConfig.workspace = "";
              setTogglToken("");
              setTogglWorkspace(null);
              qc.setQueryData(["workspaces"], []);
            }}
          >
            <View className="flex items-center justify-center rounded-full bg-red-600 p-2 px-6">
              <Text className="text-lg text-white">
                Delete Interal Databases
              </Text>
            </View>
          </TouchableNativeFeedback>
        </View>
      </View>
    </View>
  );
}
