import * as SecureStore from "expo-secure-store";
import StyledTextInput from "@/components/TextInput";
import { useState } from "react";
import { Text, TouchableNativeFeedback, View } from "react-native";
import { TogglConfig } from "@/apis/toggl";
import { Data } from "@/apis/data";

export default function Page() {
  const [togglToken, setTogglToken] = useState<string>("");
  const [entered, setEntered] = useState<boolean>(false);
  const setEnteredTrue = () => {
    setEntered(true);
    setTimeout(() => {
      setEntered(false);
    }, 3000);
  };

  return (
    <View className="p-4">
      <StyledTextInput
        label="Toggl Token"
        bgColor="white"
        value={togglToken}
        onChange={setTogglToken}
      />
      <View className="flex w-full flex-row justify-end pt-4">
        {entered && (
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
              setEnteredTrue();
            }}
          >
            <View className="flex w-28 items-center justify-center rounded-full bg-slate-200 p-2">
              <Text className="text-lg">Enter</Text>
            </View>
          </TouchableNativeFeedback>
        </View>
      </View>
    </View>
  );
}
