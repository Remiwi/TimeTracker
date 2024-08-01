import * as SecureStore from "expo-secure-store";
import StyledTextInput from "@/components/TextInput";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Text,
  ToastAndroid,
  TouchableNativeFeedback,
  View,
} from "react-native";
import { Toggl, TogglConfig } from "@/apis/toggl";
import Database from "@/apis/db";
import { Data } from "@/apis/data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import MyDropDown from "@/components/DropDown";
import { Workspace } from "@/apis/types";
import { Icon } from "@/components/Icon";
import ConfirmModal from "@/components/ConfirmModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
          bgColor="white"
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
      <View className="flex w-full items-center border-b border-gray-200 pb-6">
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
      <Text className="px-4 pb-2 pt-4 text-2xl font-bold">Backups</Text>
      <View className="flex-row items-center">
        <Text className="px-2 text-lg font-semibold">Regular backups:</Text>
        <RegularBackups />
      </View>
      <Text className="pb-8 pl-6 pr-2 text-sm">
        <Text className="font-semibold">Note:</Text> Currently regular backups
        are only performed immediately before a sync. They will never happen
        when the app is not open.
      </Text>
      <View className="w-full flex-row items-start justify-center gap-4 px-2 pb-2">
        {Platform.OS === "android" && (
          <View className="flex-grow pb-2">
            <BackupExternalDir />
          </View>
        )}
        <ManualBackup />
      </View>
      <View className="px-2">
        <BackupList />
      </View>
    </View>
  );
}

function RegularBackups() {
  const frequency = useQuery({
    queryKey: ["backups", "frequency"],
    queryFn: async () => AsyncStorage.getItem("backupsFrequency"),
  });
  const frequencyMutation = useMutation({
    mutationKey: ["backups", "frequency"],
    mutationFn: async (freq: string) =>
      AsyncStorage.setItem("backupsFrequency", freq),
  });

  if (
    frequency.isSuccess &&
    (frequency.data === null ||
      !["daily", "weekly", "never"].includes(frequency.data))
  ) {
    frequencyMutation.mutate("weekly");
  }

  return (
    <View className="flex-row overflow-hidden rounded-full border border-gray-300 bg-gray-200">
      <TouchableNativeFeedback
        onPress={() => {
          frequencyMutation.mutate("daily");
        }}
      >
        <View
          className="w-20 items-center justify-center py-2"
          style={
            frequency.data === "daily"
              ? { backgroundColor: "#d1d5db" }
              : undefined
          }
        >
          <Text
            className="text-gray-500"
            style={frequency.data === "daily" ? { color: "black" } : undefined}
          >
            Daily
          </Text>
        </View>
      </TouchableNativeFeedback>
      <TouchableNativeFeedback
        onPress={() => {
          frequencyMutation.mutate("weekly");
        }}
      >
        <View
          className="w-20 items-center justify-center py-2"
          style={
            frequency.data === "weekly"
              ? { backgroundColor: "#d1d5db" }
              : undefined
          }
        >
          <Text
            className="text-gray-500"
            style={frequency.data === "weekly" ? { color: "black" } : undefined}
          >
            Weekly
          </Text>
        </View>
      </TouchableNativeFeedback>
      <TouchableNativeFeedback
        onPress={() => {
          frequencyMutation.mutate("never");
        }}
      >
        <View
          className="w-20 items-center justify-center py-2"
          style={
            frequency.data === "never"
              ? { backgroundColor: "#d1d5db" }
              : undefined
          }
        >
          <Text
            className="text-gray-500"
            style={frequency.data === "never" ? { color: "black" } : undefined}
          >
            Never
          </Text>
        </View>
      </TouchableNativeFeedback>
    </View>
  );
}

function BackupExternalDir() {
  const [errorText, setErrorText] = useState<string | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const qc = useQueryClient();

  const externalDir = useQuery({
    queryKey: ["backups", "externalDir"],
    queryFn: Data.Backups.getExternalBackupDirectory,
  });

  const externalDirMutation = useMutation({
    mutationKey: ["backups"],
    mutationFn: Data.Backups.setExternalBackupDirectory,
    onError: (e) => {
      setErrorText(e.message);
    },
    onSuccess: (data) => {
      setErrorText(null);
      qc.setQueryData(["backups", "externalDir"], data);
      qc.invalidateQueries({ queryKey: ["backups"] });
    },
  });
  const clearExternalDirMutation = useMutation({
    mutationKey: ["backups"],
    mutationFn: Data.Backups.clearExternalBackupDirectory,
    onError: (e) => {
      console.error(e);
    },
    onSuccess: () => {
      qc.setQueryData(["backups", "externalDir"], null);
    },
  });

  let externalDirText = "Loading...";
  if (externalDir.isSuccess && externalDir.data !== null) {
    externalDirText = "[External]/" + externalDir.data.split("primary:")[1];
  }
  if (externalDir.isSuccess && externalDir.data === null) {
    externalDirText = "No External Backup Directory";
  }

  return (
    <View className="relative rounded-md">
      <ConfirmModal
        visible={confirmModalVisible}
        title="Remove External Backup Directory?"
        description={[
          "The folder will still exist in your storage, and the backups will stay there, but backups will not be saved there.",
          "Backups can still be created manually and automatically, but they will be saved to the app's internal storage.",
        ].join(" ")}
        leftText="Cancel"
        rightText="Confirm"
        onLeft={() => {
          setConfirmModalVisible(false);
        }}
        onRight={() => {
          setConfirmModalVisible(false);
          clearExternalDirMutation.mutate();
        }}
      />
      <Text className="absolute -top-3 left-2 z-10 bg-white px-1 text-sm text-slate-600">
        External Directory
      </Text>
      <TouchableNativeFeedback
        onPress={() => {
          externalDirMutation.mutate();
        }}
      >
        <View className="flex-row justify-between rounded-md border-2 border-gray-500 px-2">
          <Text
            className="px-2 py-2"
            style={{
              color:
                (errorText && "#d44") ||
                (!externalDir.data && "#bbb") ||
                undefined,
            }}
          >
            {errorText ?? externalDirText}
          </Text>
          {externalDir.isSuccess && externalDir.data !== null && (
            <View className="overflow-hidden rounded-full">
              <TouchableNativeFeedback
                onPress={() => {
                  setConfirmModalVisible(true);
                }}
              >
                <View className="items-center justify-center p-2">
                  <Icon name="material/close" size={20} />
                </View>
              </TouchableNativeFeedback>
            </View>
          )}
        </View>
      </TouchableNativeFeedback>
    </View>
  );
}

function ManualBackup() {
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const backupMutation = useMutation({
    mutationKey: ["backups"],
    mutationFn: async (data: { email: string; overwrite: boolean }) =>
      Data.Backups.backup(data.email, data.overwrite),
    onError: (e) => {
      if (e instanceof Error && e.message === "Backup already exists") {
        setConfirmModalVisible(true);
        return;
      }
      console.error(e);
    },
  });

  return (
    <View className="overflow-hidden rounded-full">
      <ConfirmModal
        visible={confirmModalVisible}
        title="Overwrite today's existing backup?"
        leftText="No"
        rightText="Yes"
        onLeft={() => setConfirmModalVisible(false)}
        onRight={() => {
          setConfirmModalVisible(false);
          backupMutation.mutate({ email: "", overwrite: true });
        }}
      />
      <TouchableNativeFeedback
        onPress={() => {
          backupMutation.mutate({ email: "", overwrite: false });
        }}
      >
        <View className="bg-gray-200 px-6 py-3">
          <Text className="font-bold">Manual Backup</Text>
        </View>
      </TouchableNativeFeedback>
    </View>
  );
}

function BackupList() {
  const [confirmModalVisible, setConfirmModalVisible] =
    useState<boolean>(false);
  const toDeleteRef = useRef<string | null>(null);

  const backups = useQuery({
    queryKey: ["backups"],
    queryFn: Data.Backups.getAll,
  });
  const externalDir = useQuery({
    queryKey: ["backups", "externalDir"],
    queryFn: Data.Backups.getExternalBackupDirectory,
  });

  const deleteBackupMutation = useMutation({
    mutationKey: ["backups"],
    mutationFn: Data.Backups.delete,
    onError: (e) => {
      console.error(e);
    },
  });

  const shareMutation = useMutation({
    mutationFn: Data.Backups.share,
    onError: (e) => {
      console.error(e);
      ToastAndroid.show(e.message, ToastAndroid.SHORT);
    },
  });

  return (
    <View className="overflow-hidden rounded-md border-2 border-gray-500">
      <ConfirmModal
        visible={confirmModalVisible}
        title="Delete Backup?"
        leftText="Cancel"
        rightText="Delete"
        onLeft={() => {
          setConfirmModalVisible(false);
          toDeleteRef.current = null;
        }}
        onRight={() => {
          setConfirmModalVisible(false);
          if (toDeleteRef.current === null) return;
          deleteBackupMutation.mutate(toDeleteRef.current);
          toDeleteRef.current = null;
        }}
        rightClassName="text-red-600 text-lg font-bold"
      />
      <View className="h-6 flex-row items-center bg-gray-100">
        <Text className="w-1/4 border-r border-gray-500 px-2 font-semibold">
          Created
        </Text>
        <Text className="w-1/4 border-r border-gray-500 px-2">From</Text>
        <Text className="w-1/4 border-r border-gray-500 px-2">To</Text>
        <View className="w-1/4" />
      </View>
      {!backups.isError &&
        (backups.data ?? []).map((b) => (
          <View
            className="h-10 flex-row items-center border-t border-gray-500"
            key={b.filename}
          >
            <View className="h-full w-1/4 justify-center border-r border-gray-500 px-2">
              <Text className="font-semibold">
                {b.generated.toISOString().split("T")[0]}
              </Text>
            </View>
            <View className="h-full w-1/4 justify-center border-r border-gray-500 px-2">
              <Text>{b.oldest.toISOString().split("T")[0]}</Text>
            </View>
            <View className="h-full w-1/4 justify-center border-r border-gray-500 px-2">
              <Text>{b.newest.toISOString().split("T")[0]}</Text>
            </View>
            <View className="h-full w-1/4 flex-row items-center justify-center gap-3">
              <View className="overflow-hidden rounded-full">
                <TouchableNativeFeedback
                  onPress={() => shareMutation.mutate(b.filename)}
                >
                  <View className="items-center justify-center p-2">
                    <Icon name="material/share" size={20} />
                  </View>
                </TouchableNativeFeedback>
              </View>
              <View className="overflow-hidden rounded-full">
                <TouchableNativeFeedback
                  onPress={() => {
                    if (externalDir.isSuccess && externalDir.data === null) {
                      toDeleteRef.current = b.filename;
                      setConfirmModalVisible(true);
                    } else if (externalDir.isSuccess) {
                      ToastAndroid.show(
                        "External storage is being used, delete using your file manager",
                        ToastAndroid.SHORT,
                      );
                    } else {
                      ToastAndroid.show(
                        "Checking if external storage is being used, please try again",
                        ToastAndroid.SHORT,
                      );
                    }
                  }}
                >
                  <View className="items-center justify-center p-2">
                    <Icon
                      name="material-community/trash-can"
                      size={20}
                      color={
                        externalDir.isSuccess && externalDir.data === null
                          ? "black"
                          : "#ccc"
                      }
                    />
                  </View>
                </TouchableNativeFeedback>
              </View>
            </View>
          </View>
        ))}
      {backups.isError && (
        <View className="h-16 w-full items-center justify-center border-t border-gray-500">
          <Text className="text-xl text-red-700">Error reading backups</Text>
        </View>
      )}
      {backups.data?.length === 0 && (
        <View className="h-16 w-full items-center justify-center border-t border-gray-500">
          <Text className="text-xl font-bold text-gray-400">No backups</Text>
        </View>
      )}
    </View>
  );
}
