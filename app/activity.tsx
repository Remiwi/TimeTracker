import { Entry, TogglProject } from "@/apis/types";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  FlatList,
  Modal,
  Text,
  TouchableNativeFeedback,
  Vibration,
  View,
} from "react-native";
import React, { useState } from "react";
import { FlashList } from "@shopify/flash-list";
import StyledTextInput from "@/components/TextInput";
import MyDropDown from "@/components/DropDown";
import MyTagInput from "@/components/TagInput";
import { Data } from "@/apis/data";
import TimerText from "@/components/TimerText";

export default function Page() {
  const [showEntryEditModal, setShowEntryEditModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | undefined>(
    undefined,
  );
  const [entryCreationDate, setEntryCreationDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  const entriesQuery = useQuery({
    queryKey: ["entries"],
    queryFn: Data.Entries.getAll,
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: Data.Projects.getAll,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return await Data.Projects.sync().then(
        async () => await Data.Entries.sync(),
      );
    },
    onError: (err) => {
      console.error(err);
    },
    onSuccess: () => {
      entriesQuery.refetch();
      projectsQuery.refetch();
    },
  });

  if (entriesQuery.isLoading) {
    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (entriesQuery.isError || !entriesQuery.data) {
    return (
      <View>
        <Text>Error: {entriesQuery.error?.message}</Text>
      </View>
    );
  }

  const entries_by_date: {
    date: string;
    entries: Entry[];
    latest_at: string;
  }[] = [];
  for (const entry of entriesQuery.data) {
    if (entry.stop === null) continue;

    const date = entry.start.split("T")[0];
    if (entries_by_date.length === 0) {
      entries_by_date.push({ date, entries: [entry], latest_at: entry.at });
      continue;
    }
    const prev_entry = entries_by_date[entries_by_date.length - 1];
    if (prev_entry.date === date) {
      prev_entry.entries.push(entry);
      if (entry.at > prev_entry.latest_at) {
        prev_entry.latest_at = entry.at;
      }
    } else {
      entries_by_date.push({ date, entries: [entry], latest_at: entry.at });
    }
  }

  const currentEntry = entriesQuery.data.find((e) => e.stop === null);

  return (
    <View className="h-full w-full bg-gray-100">
      {showEntryEditModal && (
        <EntryEditModal
          onCancel={() => {
            setSelectedEntry(undefined);
            setShowEntryEditModal(false);
          }}
          onCreate={(e) => {}}
          onEdit={(e) => {}}
          onDelete={(id) => {}}
          defaultEntry={selectedEntry}
          day={entryCreationDate}
        />
      )}
      {!showEntryEditModal && (
        <FABs
          onSync={() => {
            Vibration.vibrate(50);
            syncMutation.mutate();
          }}
        />
      )}
      {currentEntry && (
        <View className="p-2">
          <GroupedEntry entries={[currentEntry]} />
        </View>
      )}
      <FlashList
        data={entries_by_date}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => (
          <Day
            key={item.date}
            date={item.date}
            entries={item.entries}
            latest_at={item.latest_at}
            projects={projectsQuery.data}
            onEntryPress={(e) => {
              setSelectedEntry(e);
              setShowEntryEditModal(true);
            }}
            onEntryCreate={(date) => {
              setEntryCreationDate(date);
              setSelectedEntry(undefined);
              setShowEntryEditModal(true);
            }}
          />
        )}
        estimatedItemSize={200}
        contentContainerStyle={{ paddingTop: 32 }}
      />
    </View>
  );
}

function Day(props: {
  entries: Entry[];
  date: string;
  latest_at: string;
  projects?: TogglProject[];
  onEntryPress?: (e: Entry) => void;
  onEntryCreate?: (date: string) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const groups: {
    description: string | null;
    project_id: number | null;
    tags: string;
    entries: Entry[];
  }[] = [];

  for (const entry of props.entries) {
    if (groups.length === 0) {
      groups.push({
        description: entry.description,
        project_id: entry.project_id,
        tags: entry.tags.join(","),
        entries: [entry],
      });
      continue;
    }
    const prev_group = groups[groups.length - 1];
    if (
      prev_group.description === entry.description &&
      prev_group.project_id === entry.project_id &&
      prev_group.tags === entry.tags.join(",")
    ) {
      prev_group.entries.push(entry);
    } else {
      groups.push({
        description: entry.description,
        project_id: entry.project_id,
        tags: entry.tags.join(","),
        entries: [entry],
      });
    }
  }

  return (
    <View className="pb-12">
      <View className="flex w-full flex-row items-center justify-between px-2 pb-0.5 pr-4">
        <Text className="text-xl font-extrabold">
          {props.date === today
            ? "Today"
            : props.date === yesterday
              ? "Yesterday"
              : props.date}
        </Text>
        <View className="overflow-hidden rounded-full">
          <TouchableNativeFeedback
            onPress={() => {
              props.onEntryCreate?.(props.date);
            }}
          >
            <View className="p-0.5">
              <MaterialIcons name="add" size={24} color={"#000000"} />
            </View>
          </TouchableNativeFeedback>
        </View>
      </View>
      <FlatList
        scrollEnabled={false}
        data={groups}
        renderItem={({ item }) => (
          <GroupedEntry
            entries={item.entries}
            project={props.projects?.find(
              (p) => p.id === item.entries[0].project_id,
            )}
            onEntryPress={props.onEntryPress}
          />
        )}
        contentContainerClassName="flex gap-4 px-2 py-1"
      />
    </View>
  );
}

function GroupedEntry(props: {
  entries: Entry[];
  project?: TogglProject;
  onEntryPress?: (e: Entry) => void;
}) {
  const total_duration = props.entries.reduce(
    (acc, entry) => acc + entry.duration,
    0,
  );
  const seconds = (total_duration % 60).toFixed(0).padStart(2, "0");
  const minutes = (Math.floor(total_duration / 60) % 60)
    .toFixed(0)
    .padStart(2, "0");
  const hours = Math.floor(total_duration / 3600);

  return (
    <View className="min-h-16 overflow-hidden rounded-xl shadow-sm shadow-black">
      <TouchableNativeFeedback
        onPress={() => props.onEntryPress?.(props.entries[0])}
      >
        <View className="flex min-h-16 flex-row bg-white pb-2 pt-1">
          {props.entries.length > 1 && (
            <View className="flex aspect-square items-center justify-center pl-4">
              <View className="flex aspect-square items-center justify-center rounded-xl border border-black p-1.5">
                <Text>{props.entries.length}</Text>
              </View>
            </View>
          )}
          <View className="flex justify-center px-4">
            <Text
              className={"text-lg"}
              style={{
                fontWeight: props.entries[0].description ? "bold" : "normal",
                fontStyle: props.entries[0].description ? "normal" : "italic",
                color: props.entries[0].description ? "black" : "gray",
              }}
            >
              {props.entries[0].description || "No description"}
            </Text>
            {props.project && (
              <Text className="text-lg" style={{ color: props.project.color }}>
                {props.project.name}
              </Text>
            )}
            {props.entries[0].tags.length > 0 && (
              <View className="flex flex-row items-center gap-1 pt-1">
                <MaterialCommunityIcons
                  name="tag-outline"
                  style={{ color: "#999999" }}
                />
                <Text>{props.entries[0].tags.join(", ")}</Text>
              </View>
            )}
          </View>
          <View className="flex flex-grow flex-row justify-end pr-4 pt-2">
            {props.entries[0].stop && (
              <Text className="font-bold">
                {hours}:{minutes}:{seconds}
              </Text>
            )}
            {!props.entries[0].stop && (
              <TimerText
                startTime={new Date(props.entries[0].start)}
                className="font-bold"
              />
            )}
          </View>
        </View>
      </TouchableNativeFeedback>
    </View>
  );
}

function EntryEditModal(props: {
  onCancel: () => void;
  onCreate: (e: Partial<Entry>) => void;
  onEdit: (e: Partial<Entry>) => void;
  onDelete: (id: number) => void;
  day: string;
  defaultEntry?: Entry;
}) {
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: Data.Projects.getAll,
  });

  const day = new Date(props.day);
  const defaultStart = new Date();
  defaultStart.setUTCFullYear(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
  );
  defaultStart.setTime(defaultStart.getTime() - 60 * 60 * 1000);
  const defaultStop = new Date();
  defaultStop.setUTCFullYear(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
  );

  const [editEntry, setEditEntry] = useState<Partial<Entry>>(
    props.defaultEntry || {
      id: undefined,
      description: undefined,
      project_id: undefined,
      tags: [],
      start: defaultStart.toISOString(),
      stop: defaultStop.toISOString(),
    },
  );

  const onDone = () => {
    if (props.defaultEntry === undefined) {
      props.onCreate(editEntry);
    } else {
      props.onEdit(editEntry);
    }
  };

  const onDelete = () => {
    if (props.defaultEntry !== undefined) {
      props.onDelete(props.defaultEntry.id);
    }
  };

  return (
    <Modal animationType="slide" transparent>
      <View
        className="flex h-full w-full items-center justify-center p-16"
        style={{ backgroundColor: "#00000088" }}
      >
        <View className="w-full rounded-2xl bg-gray-50 p-4">
          {props.defaultEntry !== undefined && (
            <View className="flex items-center pb-2">
              <View className="w-44 overflow-hidden rounded-full shadow-sm shadow-slate-800">
                <TouchableNativeFeedback onPress={onDelete}>
                  <View className="flex w-full items-center rounded-full bg-slate-100 p-2">
                    <Text className="font-bold">Delete Entry</Text>
                  </View>
                </TouchableNativeFeedback>
              </View>
            </View>
          )}
          <Text className="pb-4 text-lg">Entry Properties</Text>
          <StyledTextInput
            label="Description"
            value={editEntry.description || undefined}
            onChange={(t) => {
              setEditEntry({ ...editEntry, description: t });
            }}
            className="pb-2"
          />
          <MyDropDown
            placeholder="Select Project"
            options={projectsQuery.data || []}
            value={projectsQuery.data?.find(
              (p) => p.id === editEntry.project_id,
            )}
            onChange={(item) => {
              setEditEntry({ ...editEntry, project_id: item.id });
            }}
            itemToString={(item) => item.name}
            className="z-40 pb-2"
            placeholderColor={projectsQuery.isError ? "#884444" : undefined}
          />
          <MyTagInput
            placeholder="Tags"
            value={editEntry.tags}
            onChange={(t) => setEditEntry({ ...editEntry, tags: t })}
            className="pb-8"
          />
          <View className="flex flex-grow flex-row justify-between gap-4 pb-4">
            <StyledTextInput
              value={editEntry.start?.split("T")[0]}
              onChange={(t) => {
                setEditEntry({
                  ...editEntry,
                  start:
                    t +
                    "T" +
                    editEntry.start?.split("T")[1].split("+")[0].split(".")[0],
                });
              }}
              className="flex-grow"
              label="Start Date"
            />
            <StyledTextInput
              value={editEntry.start?.split("T")[1].split("+")[0].split(".")[0]}
              onChange={(t) => {
                setEditEntry({
                  ...editEntry,
                  start: editEntry.start?.split("T")[0] + "T" + t + "+00:00",
                });
              }}
              className="flex-grow"
              label="Start Time"
            />
          </View>
          <View className="flex flex-grow flex-row justify-between gap-4 pb-4">
            <StyledTextInput
              value={editEntry.stop?.split("T")[0]}
              onChange={(t) => {
                setEditEntry({
                  ...editEntry,
                  stop:
                    t +
                    "T" +
                    editEntry.stop?.split("T")[1].split("+")[0].split(".")[0],
                });
              }}
              className="flex-grow"
              label="Stop Date"
            />
            <StyledTextInput
              value={editEntry.stop?.split("T")[1].split("+")[0].split(".")[0]}
              onChange={(t) => {
                setEditEntry({
                  ...editEntry,
                  stop: editEntry.stop?.split("T")[0] + "T" + t + "+00:00",
                });
              }}
              className="flex-grow"
              label="Stop Time"
            />
          </View>
          <View className="flex flex-grow flex-row justify-between">
            <View className="overflow-hidden rounded-full shadow-sm shadow-slate-800">
              <TouchableNativeFeedback onPress={props.onCancel}>
                <View className="flex w-28 items-center rounded-full bg-gray-100 p-2">
                  <Text className="font-bold">Cancel</Text>
                </View>
              </TouchableNativeFeedback>
            </View>
            <View className="overflow-hidden rounded-full shadow-sm shadow-slate-800">
              <TouchableNativeFeedback onPress={onDone}>
                <View className="flex w-28 items-center rounded-full bg-slate-200 p-2">
                  <Text className="font-bold">Done</Text>
                </View>
              </TouchableNativeFeedback>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FABs(props: { onSync?: () => void }) {
  return (
    <View className="absolute bottom-5 right-5 z-50 flex items-center gap-4">
      <View className="flex flex-row-reverse items-end justify-center gap-4">
        <View className="flex h-20 w-20 overflow-hidden rounded-full shadow-lg shadow-slate-950">
          <TouchableNativeFeedback onPress={props.onSync}>
            <View className="h-full w-full items-center justify-center bg-gray-600">
              <MaterialCommunityIcons name="sync" color="white" size={52} />
            </View>
          </TouchableNativeFeedback>
        </View>
      </View>
    </View>
  );
}
