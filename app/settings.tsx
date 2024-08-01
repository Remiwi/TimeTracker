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
import {
  Mutation,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import MyDropDown from "@/components/DropDown";
import { Workspace } from "@/apis/types";
import { Icon } from "@/components/Icon";
import ConfirmModal from "@/components/ConfirmModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CheckBox from "@/components/CheckBox";

export default function Page() {
  return (
    <View className="pt-4">
      <Sync />
      <Backups />
    </View>
  );
}

function Sync() {
  const [wsChangeModalVisible, setWsChangeModalVisible] = useState(false);

  const qc = useQueryClient();

  const syncEnabled = useQuery({
    queryKey: ["syncEnabled"],
    queryFn: async () => {
      const item = await AsyncStorage.getItem("syncEnabled");
      return item === "true";
    },
  });
  const syncEnabledMutation = useMutation({
    mutationKey: ["syncEnabled"],
    mutationFn: async (enabled: boolean) =>
      AsyncStorage.setItem("syncEnabled", enabled ? "true" : "false"),
  });

  const [togglToken, setTogglToken] = useState<string>("");
  const [tokenEntered, setTokenEntered] = useState(false);
  const tokenMutation = useMutation({
    mutationKey: ["togglToken"],
    mutationFn: async (newToken: string | null) => {
      qc.removeQueries({
        queryKey: ["workspaces"],
      });
      workspaceMutation.mutate(null);
      SecureStore.setItem("togglToken", newToken ?? "");
      TogglConfig.token = newToken;
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      setTogglToken("");
      if (newToken !== null) {
        setTokenEntered(true);
        setTimeout(() => {
          setTokenEntered(false);
        }, 3000);
      }
    },
  });

  const workspaces = useQuery({
    queryKey: ["workspaces"],
    queryFn: Toggl.Me.getWorkspaces,
  });
  const currentWorkspaceQuery = useQuery({
    queryKey: ["workspaces", "current"],
    queryFn: async () => {
      const ws = SecureStore.getItem("togglWorkspace");
      return ws === null || ws === "" ? null : Number(ws);
    },
  });
  const currentWorkspace = currentWorkspaceQuery.isSuccess
    ? (workspaces.data ?? []).find((w) => {
        return w.id === currentWorkspaceQuery.data;
      })
    : undefined;
  const workspaceMutation = useMutation({
    mutationKey: ["workspaces", "current"],
    mutationFn: async (ws: number | null) => {
      SecureStore.setItem("togglWorkspace", ws === null ? "" : ws.toString());
      TogglConfig.workspace = ws?.toString() ?? null;
      if (ws !== null) {
        setWorkspaceEntered(true);
        setTimeout(() => {
          setWorkspaceEntered(false);
        }, 3000);

        if ((await Data.Entries.getAll()).length > 0) {
          setWsChangeModalVisible(true);
        } else {
          syncMutation.mutate();
        }
      }
    },
  });
  const [workspaceEntered, setWorkspaceEntered] = useState<boolean>(false);

  if (
    workspaces.isSuccess &&
    workspaces.data.length >= 1 &&
    !currentWorkspace &&
    !workspaceMutation.isPending
  ) {
    workspaceMutation.mutate(workspaces.data[0].id);
  }

  const deleteInternalDatabases = () => {
    Database.Manage.dropAllTablesSync();
    Database.Manage.intializeDBSync();
    qc.resetQueries();
  };

  const removeTogglToken = () => {
    SecureStore.deleteItemAsync("togglToken");
    SecureStore.deleteItemAsync("togglWorkspace");
    TogglConfig.token = "";
    TogglConfig.workspace = "";
    workspaceMutation.mutate(null);
    setTogglToken("");
    qc.resetQueries({ queryKey: ["togglToken"] });
    qc.resetQueries({ queryKey: ["workspaces"] });
  };

  const syncMutation = useMutation({
    mutationFn: Data.Sync.sync,
    onMutate: () => {
      qc.invalidateQueries();
    },
  });

  return (
    <>
      <ConfirmModal
        visible={wsChangeModalVisible}
        title="Remove old workspace entries before syncing?"
        description={[
          "All local-only entries will be pushed to the new workspace, and all entries from the new workspace will be copied locally.",
          "If there are any entries on this app right now, this could result in undesired entry mixing or duplication.",
          "To avoid this, disable syncing or remove all entries from this app.",
          "Otherwise, select 'Disable Sync', then re-enable and re-launch app.",
          "\n\nIf you're not sure, select 'Remove Entries'.",
        ].join("")}
        leftText="Remove Entries"
        rightText="Disable Sync"
        onLeft={() => {
          setWsChangeModalVisible(false);
          deleteInternalDatabases();
          syncMutation.mutate();
        }}
        onRight={() => {
          setWsChangeModalVisible(false);
          syncEnabledMutation.mutate(false);
        }}
        leftClassName="font-bold text-lg text-center"
        rightClassName="font-bold text-lg text-center"
        buttonWidth={128}
      />
      <Text className="px-4 text-2xl font-bold">Sync</Text>
      <View className="flex-row items-center justify-between px-4 pb-2">
        <Text className="text-lg font-semibold">Sync Enabled</Text>
        <CheckBox
          value={syncEnabled.data === true}
          onChange={(enabled) => syncEnabledMutation.mutate(enabled)}
          offStyle={{ borderStyle: "solid", borderWidth: 2 }}
        />
      </View>
      <View className="flex-row items-center gap-2 px-2">
        <StyledTextInput
          className="flex-grow"
          label="Toggl Token"
          bgColor="white"
          value={togglToken}
          onChange={setTogglToken}
        />
        <View className="overflow-hidden rounded-full">
          <TouchableNativeFeedback
            onPress={() => {
              if (togglToken === "") return;
              tokenMutation.mutate(togglToken);
            }}
          >
            <View className="flex w-28 items-center justify-center bg-slate-200 p-2">
              <Text className="text-lg">Enter</Text>
            </View>
          </TouchableNativeFeedback>
        </View>
      </View>
      <View className="w-full flex-row justify-end pb-2">
        <Text className="px-4 text-gray-500">
          {tokenEntered ? "Token entered" : ""}
        </Text>
      </View>
      <View className="px-2 pb-2">
        <MyDropDown
          label="Toggl Workspace"
          bgColor="white"
          options={workspaces.data || []}
          itemToString={(item) => item?.name || ""}
          modalColor="#eeeeee"
          value={currentWorkspace}
          onChange={(w) => {
            if (!w) return;
            workspaceMutation.mutate(w.id);
          }}
        />
        <View className="w-full flex-row justify-end pb-2">
          <Text className="px-4 text-gray-500">
            {workspaceEntered ? "Workspace entered" : ""}
          </Text>
        </View>
      </View>
      <View className="flex w-full items-center border-b border-gray-200 pb-6">
        <View className="overflow-hidden rounded-full">
          <TouchableNativeFeedback
            onPress={() => {
              deleteInternalDatabases();
              removeTogglToken();
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
    </>
  );
}

function Backups() {
  return (
    <>
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
    </>
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
