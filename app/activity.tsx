import { Entry, TogglProject } from "@/apis/types";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Dates } from "@/utils/dates";
import { Tags } from "@/utils/tags";

export default function Page() {
  const qc = useQueryClient();

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
      qc.invalidateQueries({
        queryKey: ["projects"],
      });
      qc.invalidateQueries({
        queryKey: ["entries"],
      });
      entriesQuery.refetch();
      projectsQuery.refetch();
    },
  });

  const entryCreateMutation = useMutation({
    mutationFn: async (entry: Partial<Entry> & { start: string }) => {
      return await Data.Entries.create(entry);
    },
    onError: (err) => {
      console.error(err);
    },
    onSuccess: () => {
      entriesQuery.refetch();
    },
  });

  const entryEditMutation = useMutation({
    mutationFn: async (entry: Partial<Entry> & { id: number }) => {
      return await Data.Entries.edit(entry);
    },
    onError: (err) => {
      console.error(err);
    },
    onSuccess: () => {
      entriesQuery.refetch();
    },
  });

  const entryDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await Data.Entries.delete(id);
    },
    onError: (err) => {
      console.error(err);
    },
    onSuccess: () => {
      entriesQuery.refetch();
    },
  });

  const entries = entriesQuery.data || [];

  const entries_by_date: {
    date: string;
    entries: Entry[];
    latest_at: string;
  }[] = [];
  for (const entry of entries) {
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

  const currentEntry = entries.find((e) => e.stop === null);
  const currentEntryProject = projectsQuery.data?.find(
    (p) => p.id === currentEntry?.project_id,
  );

  return (
    <View className="h-full w-full bg-gray-100">
      {showEntryEditModal && (
        <EntryEditModal
          onCancel={() => {
            setSelectedEntry(undefined);
            setShowEntryEditModal(false);
          }}
          onCreate={(e) => {
            entryCreateMutation.mutate(e);
            setShowEntryEditModal(false);
          }}
          onEdit={(e) => {
            entryEditMutation.mutate(e);
            setShowEntryEditModal(false);
          }}
          onDelete={(id) => {
            entryDeleteMutation.mutate(id);
            setShowEntryEditModal(false);
          }}
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
          <GroupedEntry
            entries={[currentEntry]}
            project={currentEntryProject}
          />
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
  const yesterday = Dates.daysAgo(1).toISOString().split("T")[0];

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
        tags: Tags.toString(entry.tags),
        entries: [entry],
      });
      continue;
    }
    const prev_group = groups[groups.length - 1];
    if (
      prev_group.description === entry.description &&
      prev_group.project_id === entry.project_id &&
      prev_group.tags === Tags.toString(entry.tags)
    ) {
      prev_group.entries.push(entry);
    } else {
      groups.push({
        description: entry.description,
        project_id: entry.project_id,
        tags: Tags.toString(entry.tags),
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
  onCreate: (e: Partial<Entry> & { start: string }) => void;
  onEdit: (e: Partial<Entry> & { id: number }) => void;
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

  const [editEntry, setEditEntry] = useState<
    Partial<Entry> & { start: string }
  >(
    props.defaultEntry || {
      id: undefined,
      description: undefined,
      project_id: undefined,
      tags: [],
      start: Dates.toISOExtended(defaultStart),
      stop: Dates.toISOExtended(defaultStop),
    },
  );

  const onDone = () => {
    if (props.defaultEntry === undefined) {
      props.onCreate({ ...editEntry, start: editEntry.start! });
    } else {
      props.onEdit({ ...editEntry, id: props.defaultEntry.id });
    }
  };

  const onDelete = () => {
    if (props.defaultEntry !== undefined) {
      props.onDelete(props.defaultEntry.id);
    }
  };

  const updateStartTime = (time: string) => {
    const oldDate = editEntry.start?.split("T")[0];
    setEditEntry({ ...editEntry, start: `${oldDate}T${time}+00:00` });
  };
  const updateStopTime = (time: string) => {
    const oldDate = editEntry.stop?.split("T")[0];
    setEditEntry({ ...editEntry, stop: `${oldDate}T${time}+00:00` });
  };
  const updateStartDate = (date: string) => {
    const oldTime = editEntry.start?.split("T")[1];
    setEditEntry({ ...editEntry, start: `${date}T${oldTime}` });
  };
  const updateStopDate = (date: string) => {
    const oldTime = editEntry.stop?.split("T")[1];
    setEditEntry({ ...editEntry, stop: `${date}T${oldTime}` });
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
              onChange={updateStartDate}
              className="flex-grow"
              label="Start Date"
            />
            <StyledTextInput
              value={editEntry.start?.split("T")[1].split("+")[0]}
              onChange={updateStartTime}
              className="flex-grow"
              label="Start Time"
            />
          </View>
          <View className="flex flex-grow flex-row justify-between gap-4 pb-4">
            <StyledTextInput
              value={editEntry.stop?.split("T")[0]}
              onChange={updateStopDate}
              className="flex-grow"
              label="Stop Date"
            />
            <StyledTextInput
              value={editEntry.stop?.split("T")[1].split("+")[0]}
              onChange={updateStopTime}
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
