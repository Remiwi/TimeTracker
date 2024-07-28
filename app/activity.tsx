import { Entry, EntryWithProject, TogglProject } from "@/apis/types";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FlatList,
  Text,
  TouchableNativeFeedback,
  Vibration,
  View,
} from "react-native";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import { Data } from "@/apis/data";
import TimerText from "@/components/TimerText";
import { Dates } from "@/utils/dates";
import { Tags } from "@/utils/tags";
import { EntryEditorSheet } from "@/components/EntryEditorSheet";
import { useEntries } from "@/hooks/entryQueries";
import { useProjects } from "@/hooks/projectQueries";
import { Icon } from "@/components/Icon";

export default function Page() {
  const qc = useQueryClient();

  const [entryEditorOpen, setEntryEditorOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<
    (Omit<EntryWithProject, "id"> & { id: number | null }) | undefined
  >(undefined);
  const entryEditorSheetRef = React.useRef<EntryEditorSheet.Ref | null>(null);
  const entryCreatorSheetRef = React.useRef<EntryEditorSheet.Ref | null>(null);

  const entriesQuery = useEntries();
  const projectsQuery = useProjects();

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

  const entries = entriesQuery.data || [];

  const entries_by_date: {
    date: string;
    entries: EntryWithProject[];
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
      <View className="z-10">
        <EntryEditorSheet
          ref={entryEditorSheetRef}
          onOpen={() => setEntryEditorOpen(true)}
          onClose={() => {
            setEntryEditorOpen(false);
          }}
          onDiscard={() => {
            setSelectedEntry(undefined);
          }}
          onSave={() => {
            setSelectedEntry(undefined);
          }}
          entry={selectedEntry}
          hideTimerWhenClosed
        />
        <EntryEditorSheet
          ref={entryCreatorSheetRef}
          onOpen={() => setEntryEditorOpen(true)}
          onClose={() => {
            setEntryEditorOpen(false);
          }}
          onDiscard={() => {
            setSelectedEntry(undefined);
          }}
          onSave={() => {
            setSelectedEntry(undefined);
          }}
          entry={selectedEntry}
          hideTimerWhenClosed
          hideDeleteButton
        />
      </View>
      {!entryEditorOpen && (
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
        scrollEnabled={!entryEditorOpen}
        data={entries_by_date}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => (
          <Day
            interactionsEnabled={!entryEditorOpen}
            key={item.date}
            date={item.date}
            entries={item.entries}
            latest_at={item.latest_at}
            projects={projectsQuery.data}
            onEntryPress={(e) => {
              setSelectedEntry(e);
              entryEditorSheetRef.current?.open();
            }}
            onEntryCreate={(date, startDatetime) => {
              const start =
                startDatetime ?? Dates.toISOExtended(new Date(date));
              const startDate = new Date(start);
              const stopDate = new Date(start);
              stopDate.setMinutes(stopDate.getMinutes() + 10);
              setSelectedEntry({
                id: null,
                start: Dates.toISOExtended(startDate),
                stop: Dates.toISOExtended(stopDate),
                description: "",
                project_id: null,
                project_color: null,
                project_name: null,
                project_icon: null,
                tags: [],
                duration: 600,
                at: Dates.toISOExtended(new Date()),
              });
              entryCreatorSheetRef.current?.open();
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
  entries: EntryWithProject[];
  date: string;
  latest_at: string;
  projects?: TogglProject[];
  onEntryPress?: (e: EntryWithProject) => void;
  onEntryCreate?: (date: string, startDatetime: string | undefined) => void;
  interactionsEnabled?: boolean;
}) {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = Dates.daysAgo(1).toISOString().split("T")[0];

  const groups: {
    description: string | null;
    project_id: number | null;
    tags: string;
    entries: EntryWithProject[];
  }[] = [];

  let latestEntryStop = undefined;

  for (const entry of props.entries) {
    // Find latest entry stop
    if (entry.stop) {
      if (!latestEntryStop) {
        latestEntryStop = entry.stop;
      } else if (entry.stop > latestEntryStop) {
        latestEntryStop = entry.stop;
      }
    }

    const desc = entry.description ?? "";
    const project = entry.project_id ?? null;
    const tags = Tags.toString(entry.tags);

    // Construct the groups
    if (groups.length === 0) {
      groups.push({
        description: desc,
        project_id: project,
        tags: tags,
        entries: [entry],
      });
      continue;
    }
    const prev_group = groups[groups.length - 1];
    if (
      prev_group.description === desc &&
      prev_group.project_id === project &&
      prev_group.tags === tags
    ) {
      prev_group.entries.push(entry);
    } else {
      groups.push({
        description: desc,
        project_id: project,
        tags: tags,
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
              props.onEntryCreate?.(props.date, latestEntryStop);
            }}
            disabled={!(props.interactionsEnabled ?? true)}
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
            interactionsEnabled={props.interactionsEnabled}
            entries={item.entries}
            project={props.projects?.find(
              (p) => p.id === item.entries[0].project_id,
            )}
            onEntryPress={props.onEntryPress}
          />
        )}
        contentContainerClassName="flex gap-2 px-2 py-1"
      />
    </View>
  );
}

function GroupedEntry(props: {
  entries: EntryWithProject[];
  project?: TogglProject;
  onEntryPress?: (e: EntryWithProject) => void;
  interactionsEnabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  useLayoutEffect(() => {
    setExpanded(false);
  }, [props.entries.length]);

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
    <View
      className="relative"
      style={{
        marginBottom: props.entries.length > 1 ? 8 : 0,
      }}
    >
      <View className="min-h-16 overflow-hidden rounded-xl shadow-sm shadow-black">
        <TouchableNativeFeedback
          onPress={() => {
            if (props.entries.length > 1) {
              setExpanded(!expanded);
            } else {
              props.onEntryPress?.(props.entries[0]);
            }
          }}
          disabled={!(props.interactionsEnabled ?? true)}
        >
          <View className="flex h-18 flex-row bg-white pb-2 pt-1">
            <View className="items-center justify-center pl-4">
              <View
                className="relative aspect-square h-10 items-center justify-center rounded-full"
                style={{
                  backgroundColor: props.project
                    ? props.project.color
                    : "#eeeeee",
                }}
              >
                {props.entries.length > 1 && (
                  <View className="absolute -right-2 -top-2 z-10 h-5 w-5 rounded-full bg-gray-300 shadow-sm shadow-black">
                    <Text
                      className="text-center text-sm text-gray-500"
                      style={{ lineHeight: 17 }}
                    >
                      {props.entries.length < 100 ? props.entries.length : "+"}
                    </Text>
                  </View>
                )}
                <Icon
                  name={props.entries[0].project_icon as any}
                  color="white"
                  size={22}
                />
              </View>
            </View>
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
                <Text
                  className="text-lg font-bold"
                  style={{ color: props.project.color }}
                >
                  {props.project.name}
                </Text>
              )}
            </View>
            <View className="flex flex-grow flex-row justify-end pr-4 pt-2">
              <View>
                {props.entries[0].stop && (
                  <Text className="pb-2 font-bold">
                    {hours}:{minutes}:{seconds}
                  </Text>
                )}
                {!props.entries[0].stop && (
                  <TimerText
                    startTime={new Date(props.entries[0].start)}
                    className="pb-2 font-bold"
                  />
                )}
                {props.entries[0].tags.length > 0 && (
                  <View className="flex flex-row justify-end">
                    <MaterialCommunityIcons
                      name="tag-outline"
                      style={{ color: "#999999" }}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableNativeFeedback>
        {expanded && (
          <View className="w-full bg-gray-100">
            {props.entries.map((entry) => {
              const start = new Date(entry.start);
              const stop = new Date(entry.stop!);
              const duration = Math.floor(
                (stop.getTime() - start.getTime()) / 1000,
              );
              const seconds = (duration % 60).toFixed(0).padStart(2, "0");
              const minutes = (Math.floor(duration / 60) % 60)
                .toFixed(0)
                .padStart(2, "0");
              const hours = Math.floor(duration / 3600);

              return (
                <TouchableNativeFeedback
                  disabled={!(props.interactionsEnabled ?? true)}
                  onPress={() => props.onEntryPress?.(entry)}
                >
                  <View className="flex h-18 flex-row border-t border-gray-300 py-2">
                    <View className="flex-row items-center justify-center gap-4 px-4">
                      <View>
                        <Text className="text-lg italic text-gray-500">
                          {(start.getMonth() + 1).toString().padStart(2, "0")}/
                          {start.getDate().toString().padStart(2, "0")}
                        </Text>
                        <Text className="text-lg italic text-gray-500">
                          {start.getHours().toString().padStart(2, "0")}:
                          {start.getMinutes().toString().padStart(2, "0")}
                        </Text>
                      </View>
                      <Text className="text-lg italic text-gray-500"> - </Text>
                      <View>
                        <Text className="text-lg italic text-gray-500">
                          {(stop.getMonth() + 1).toString().padStart(2, "0")}/
                          {stop.getDate().toString().padStart(2, "0")}
                        </Text>
                        <Text className="text-lg italic text-gray-500">
                          {stop.getHours().toString().padStart(2, "0")}:
                          {stop.getMinutes().toString().padStart(2, "0")}
                        </Text>
                      </View>
                    </View>
                    <View className="flex flex-grow flex-row justify-end pr-4 pt-2">
                      <View>
                        <Text className="pb-2 font-bold">
                          {hours}:{minutes}:{seconds}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableNativeFeedback>
              );
            })}
          </View>
        )}
      </View>
      {props.entries.length > 1 && !expanded && (
        <>
          <View className="absolute -bottom-1 -z-10 w-full px-0.5">
            <View className="flex h-18 w-full flex-row rounded-xl bg-gray-100 shadow-sm shadow-black"></View>
          </View>
          <View className="absolute -bottom-2 -z-20 w-full px-1">
            <View className="flex h-18 w-full flex-row rounded-xl bg-gray-100 shadow-sm shadow-black"></View>
          </View>
        </>
      )}
    </View>
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
