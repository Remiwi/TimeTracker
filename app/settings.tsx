import * as SecureStore from "expo-secure-store";
import StyledTextInput from "@/components/TextInput";
import { useState } from "react";
import { Text, TouchableNativeFeedback, View } from "react-native";
import { TogglConfig } from "@/apis/toggl";

export default function Page() {
  const [togglToken, setTogglToken] = useState<string>("");
  const [tokenEntered, setTokenEntered] = useState<boolean>(false);
  const setTokenEnteredTrue = () => {
    setTokenEntered(true);
    setTimeout(() => {
      setTokenEntered(false);
    }, 3000);
  };

  const [togglWorkspace, setTogglWorkspace] = useState<string>(
    SecureStore.getItem("togglWorkspace") || "",
  );
  const [workspaceEntered, setWorkspaceEntered] = useState<boolean>(false);
  const setWorkspaceEnteredTrue = () => {
    setWorkspaceEntered(true);
    setTimeout(() => {
      setWorkspaceEntered(false);
    }, 3000);
  };

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
              }}
            >
              <View className="flex w-28 items-center justify-center rounded-full bg-slate-200 p-2">
                <Text className="text-lg">Enter</Text>
              </View>
            </TouchableNativeFeedback>
          </View>
        </View>
      </View>
      <View className="p-4">
        <StyledTextInput
          label="Toggl Workspace"
          bgColor="white"
          value={togglWorkspace}
          onChange={setTogglWorkspace}
        />
        <View className="flex w-full flex-row justify-end pt-4">
          {workspaceEntered && (
            <View className="flex flex-grow justify-center">
              <Text>Token entered</Text>
            </View>
          )}
          <View className="overflow-hidden rounded-full">
            <TouchableNativeFeedback
              onPress={() => {
                if (togglWorkspace === "") return;
                SecureStore.setItem("togglWorkspace", togglWorkspace);
                TogglConfig.workspace = togglWorkspace;
                setWorkspaceEnteredTrue();
              }}
            >
              <View className="flex w-28 items-center justify-center rounded-full bg-slate-200 p-2">
                <Text className="text-lg">Enter</Text>
              </View>
            </TouchableNativeFeedback>
          </View>
        </View>
      </View>
    </View>
  );
}
