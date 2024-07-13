import { useRef, useState } from "react";
import { Text, TouchableNativeFeedback, View } from "react-native";
import TimerText from "@/components/TimerText";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Data } from "@/apis/data";
import { EntryWithProject, Project } from "@/apis/types";
import { Dates } from "@/utils/dates";
import ChipBar from "@/components/ChipBar";
import ActionChip from "@/components/ActionChip";
import ListModal from "@/components/ListModal";
import { useAtom } from "jotai";
import { templateMadeAtom } from "@/utils/atoms";
import TagModal from "@/components/TagModal";
import DateTimeEditor from "@/components/DatetimeEditor";
import StatefulTextInput from "@/components/StatefulTextInput";

export default function Timer(props: { useLatestEntryIfNoOngoing?: boolean }) {
  const qc = useQueryClient();
  const [templateMade, setTemplateMade] = useAtom(templateMadeAtom);

  const ongoingQuery = useQuery({
    queryKey: ["entries", "current"],
    queryFn: Data.Entries.getCurrent,
  });

  const lastStoppedQuery = useQuery({
    queryKey: ["entries", "previous"],
    queryFn: Data.Entries.getLastStopped,
  });

  const usedEntry = ongoingQuery.data
    ? ongoingQuery.data
    : props.useLatestEntryIfNoOngoing
      ? lastStoppedQuery.data
      : null;

  const entryQuery = useQuery({
    queryKey: ["entries", usedEntry?.id],
    queryFn: async () => {
      if (!usedEntry) {
        return null;
      }
      return await Data.Entries.get(usedEntry.id);
    },
    placeholderData: usedEntry,
  });

  const prevQuery = useQuery({
    queryKey: ["entries", usedEntry?.id, "previous"],
    queryFn: async () => {
      if (!usedEntry) {
        return null;
      }
      const prev = await Data.Entries.getPreviousTo(usedEntry);
      if (prev === null) {
        return null;
      }
      qc.setQueryData(["entries", prev.id], prev);
      return prev;
    },
  });

  const editDescriptionMutation = useMutation({
    mutationKey: ["entries"],
    mutationFn: async (description: string | null) => {
      if (!entryQuery.data) {
        return;
      }
      await Data.Entries.edit({
        id: entryQuery.data.id,
        description,
      });
    },
    onMutate: (description: string | null) => {
      if (!entryQuery.data) {
        return;
      }
      setTemplateMade(false);
      qc.setQueryData(["entries", entryQuery.data.id], {
        ...entryQuery.data,
        description,
      });
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const stopMutation = useMutation({
    mutationKey: ["entries"],
    mutationFn: Data.Entries.stopCurrent,
    onMutate: () => {
      setTemplateMade(false);
      const ongoing = qc.getQueryData<EntryWithProject>(["entries", "current"]);
      qc.setQueryData(["entries", "previous"], ongoing);
      qc.setQueryData(["entries", "current"], null);
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const fillToLastStopMutation = useMutation({
    mutationKey: ["entries"],
    mutationFn: async () => {
      if (!entryQuery.data || !prevQuery.data || !prevQuery.data.stop) {
        return;
      }
      await Data.Entries.edit({
        id: entryQuery.data.id,
        start: prevQuery.data.stop,
      });
    },
    onMutate: () => {
      if (!entryQuery.data || !prevQuery.data || !prevQuery.data.stop) {
        return;
      }
      qc.setQueryData(["entries", entryQuery.data.id], {
        ...entryQuery.data,
        start: prevQuery.data.stop,
      });
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const start = entryQuery.data ? new Date(entryQuery.data.start) : undefined;
  const stop = entryQuery.data?.stop
    ? new Date(entryQuery.data.stop)
    : undefined;

  return (
    <View className="pt-4">
      {!entryQuery.data && (
        <View className="flex items-center justify-between">
          <View className="flex h-32 flex-grow items-center justify-center">
            <Text className="px-8 text-4xl color-gray-400">
              No running entry
            </Text>
          </View>
        </View>
      )}
      {entryQuery.data && (
        <View className="h-32">
          <View className="flex flex-row items-end justify-between px-4">
            <View>
              <View className="flex flex-row items-center gap-2">
                <MaterialIcons
                  name="edit"
                  size={16}
                  color={entryQuery.data.description ? "black" : "#a8a29e"}
                  className="pb-2"
                />
                <StatefulTextInput
                  className="pb-2 text-2xl"
                  value={entryQuery.data.description || ""}
                  placeholder="Enter description..."
                  placeholderClassName="color-stone-400"
                  style={{ fontWeight: "bold" }}
                  placeholderStyle={{ fontWeight: "normal" }}
                  onChange={(t) => {
                    const text = t.trim();
                    editDescriptionMutation.mutate(text || null);
                  }}
                />
              </View>
              <TimerText
                className="text-6xl"
                startTime={start}
                stopTime={stop}
              />
            </View>
            <View
              className={
                "flex aspect-square w-24 items-center justify-center rounded-full shadow-md shadow-black"
              }
              style={{
                backgroundColor: entryQuery.data.project_color || "#cccccc",
              }}
            >
              <MaterialCommunityIcons
                name={entryQuery.data.project_icon as any}
                color="white"
                size={44}
              />
            </View>
          </View>
          {entryQuery.data?.tags.length > 0 && (
            <View className="flex flex-row items-center gap-2 px-4">
              <MaterialCommunityIcons name="tag" size={14} color="#a8a29e" />
              <Text className="font-light italic text-gray-400">
                {entryQuery.data?.tags.join(", ") || ""}
              </Text>
            </View>
          )}
        </View>
      )}
      <Chips entry={entryQuery.data || null} />
      <View className="px-4 pt-4">
        <DateTimeEditor
          date={entryQuery.data ? new Date(entryQuery.data.start) : new Date()}
          onDateChange={(date) => {
            if (!entryQuery.data) {
              return;
            }
            qc.setQueryData(["entries", entryQuery.data], {
              ...entryQuery.data,
              start: Dates.toISOExtended(date),
            });
          }}
          text="Start"
          className="pb-1"
        />
        <View className="flex w-full items-end">
          <View className="overflow-hidden rounded-sm">
            <TouchableNativeFeedback
              onPress={() => fillToLastStopMutation.mutate()}
            >
              <View>
                <Text className="px-2 py-0.5 text-sm font-semibold text-slate-600">
                  Fill to last stop
                </Text>
              </View>
            </TouchableNativeFeedback>
          </View>
        </View>
        <DateTimeEditor
          date={entryQuery.data ? new Date(entryQuery.data.start) : new Date()}
          text="Stop"
          className="pb-1"
          disabled={!entryQuery.data || !entryQuery.data.stop}
        />
        <View className="flex w-full items-end">
          <View className="overflow-hidden rounded-sm">
            <TouchableNativeFeedback onPress={() => stopMutation.mutate()}>
              <View>
                <Text className="px-2 py-0.5 text-sm font-semibold text-red-500">
                  Stop Timer
                </Text>
              </View>
            </TouchableNativeFeedback>
          </View>
        </View>
      </View>
    </View>
  );
}

function Chips(props: { entry: EntryWithProject | null }) {
  const chipBarRef = useRef<View>(null);
  const [chipBarLayout, setChipBarLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const [projectStartModalVisible, setProjectStartModalVisible] =
    useState(false);
  const [projectEditModalVisible, setProjectEditModalVisible] = useState(false);
  const [tagModalVisible, setTagModalVisible] = useState(false);

  const qc = useQueryClient();
  const [templateMade, setTemplateMade] = useAtom(templateMadeAtom);

  const entryQuery = useQuery({
    queryKey: ["entries", props.entry?.id],
    queryFn: async () => {
      if (!props.entry) {
        return null;
      }
      const entry = await Data.Entries.get(props.entry.id);
      if (entry.stop === null) {
        qc.setQueryData(["entries", "current"], entry);
      }
      return entry;
    },
    placeholderData: props.entry,
  });

  const prevQuery = useQuery({
    queryKey: ["entries", props.entry?.id, "previous"],
    queryFn: async () => {
      if (!props.entry) {
        return null;
      }
      const prev = await Data.Entries.getPreviousTo(props.entry);
      if (prev === null) {
        return null;
      }
      qc.setQueryData(["entries", prev.id], prev);
      return prev;
    },
  });

  const binQuery = useQuery({
    queryKey: ["entries", "bin"],
    queryFn: Data.Entries.getBin,
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: Data.Projects.getAll,
  });

  const startEntryMutation = useMutation({
    mutationKey: ["entries"],
    mutationFn: async (project: Project | null) => {
      await Data.Entries.start({
        project_id: project?.id || null,
      });
    },
    onMutate: (project: Project | null) => {
      setTemplateMade(false);
      const newEntry = {
        id: 0,
        description: "",
        project_id: project?.id || null,
        start: Dates.toISOExtended(new Date()),
        stop: null,
        duration: -1,
        tags: [],
        project_name: project?.name || null,
        project_icon: project?.icon || null,
        project_color: project?.color || null,
      };
      qc.setQueryData(["entries", "current"], newEntry);
      qc.setQueryData(["entries", 0], newEntry);
      qc.setQueryData(["entries", undefined], newEntry);
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const restoreEntryMutation = useMutation({
    mutationKey: ["entries"],
    mutationFn: Data.Entries.restore,
    onMutate: () => {
      setTemplateMade(false);
      qc.setQueryData(["entries", "current"], {
        ...binQuery.data,
        start: Dates.toISOExtended(new Date()),
        stop: null,
      });
      qc.setQueryData(["entries", "bin"], null);
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const editProjectMutation = useMutation({
    mutationKey: ["entries"],
    mutationFn: async (project: Project | null) => {
      if (!entryQuery.data) {
        return;
      }
      await Data.Entries.edit({
        id: entryQuery.data.id,
        project_id: project?.id || null,
      });
    },
    onMutate: (project: Project | null) => {
      if (!entryQuery.data) {
        return;
      }
      setTemplateMade(false);
      qc.setQueryData(["entries", entryQuery.data.id], {
        ...entryQuery.data,
        project_id: project?.id || null,
        project_name: project?.name || null,
        project_icon: project?.icon || null,
        project_color: project?.color || null,
      });
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const editTagsMutation = useMutation({
    mutationKey: ["entries"],
    mutationFn: async (tags: string[]) => {
      if (!entryQuery.data) {
        return;
      }
      await Data.Entries.edit({
        id: entryQuery.data.id,
        tags,
      });
    },
    onMutate: (tags: string[]) => {
      if (!entryQuery.data) {
        return;
      }
      setTemplateMade(false);
      qc.setQueryData(["entries", entryQuery.data.id], {
        ...entryQuery.data,
        tags,
      });
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const stopMutation = useMutation({
    mutationKey: ["entries"],
    mutationFn: Data.Entries.stopCurrent,
    onMutate: () => {
      setTemplateMade(false);
      const ongoing = qc.getQueryData<EntryWithProject>(["entries", "current"]);
      qc.setQueryData(["entries", "previous"], ongoing);
      qc.setQueryData(["entries", "current"], null);
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const fillToLastStopMutation = useMutation({
    mutationKey: ["entries"],
    mutationFn: async () => {
      if (!entryQuery.data || !prevQuery.data || !prevQuery.data.stop) {
        return;
      }
      await Data.Entries.edit({
        id: entryQuery.data.id,
        start: prevQuery.data.stop,
      });
    },
    onMutate: () => {
      if (!entryQuery.data || !prevQuery.data || !prevQuery.data.stop) {
        return;
      }
      qc.setQueryData(["entries", entryQuery.data.id], {
        ...entryQuery.data,
        start: prevQuery.data.stop,
      });
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const setStartToNowMutation = useMutation({
    mutationKey: ["entries"],
    mutationFn: async () => {
      if (!entryQuery.data) {
        return;
      }
      await Data.Entries.edit({
        id: entryQuery.data.id,
        start: Dates.toISOExtended(new Date()),
      });
    },
    onMutate: () => {
      if (!entryQuery.data) {
        return;
      }
      qc.setQueryData(["entries", entryQuery.data.id], {
        ...entryQuery.data,
        start: Dates.toISOExtended(new Date()),
      });
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const addTemplateMutation = useMutation({
    mutationKey: ["templates"],
    mutationFn: Data.Templates.create,
    onMutate: () => {
      setTemplateMade(true);
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const deleteMutation = useMutation({
    mutationKey: ["entries"],
    mutationFn: async () => {
      if (!entryQuery.data) {
        return;
      }
      await Data.Entries.delete(entryQuery.data.id);
    },
    onMutate: () => {
      if (!entryQuery.data) {
        return;
      }
      setTemplateMade(false);
      qc.setQueryData(["entries", "bin"], entryQuery.data);
      qc.setQueryData(["entries", entryQuery.data.id], null);
    },
    onError: (err) => {
      console.error(err);
    },
  });

  return (
    <View
      className="relative w-full"
      ref={chipBarRef}
      onLayout={(event) => {
        if (chipBarRef.current === null) return;
        chipBarRef.current.measure((rx, ry, width, height, x, y) => {
          setChipBarLayout({ x, y: y + 10, width, height });
        });
      }}
    >
      {/* Projects Start */}
      <ListModal
        options={projectsQuery.data || []}
        visible={projectStartModalVisible}
        backgroundColor="#f0f0f0"
        height={300}
        positionRelativeTo={chipBarLayout}
        renderOption={(option: Project) => (
          <View className="flex flex-row gap-4 border-b border-slate-300 px-4 py-2">
            <View
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: option.color }}
            >
              <MaterialCommunityIcons
                name={option.icon as any}
                color={"white"}
                size={16}
              />
            </View>
            <Text className="text-xl" style={{ color: option.color }}>
              {option.name}
            </Text>
          </View>
        )}
        onClose={() => setProjectStartModalVisible(false)}
        onSelect={(selected: Project) => {
          startEntryMutation.mutate(selected);
          setProjectStartModalVisible(false);
        }}
      />
      {/* Projects Edit */}
      <ListModal
        options={projectsQuery.data || []}
        visible={projectEditModalVisible}
        backgroundColor="#f0f0f0"
        height={300}
        positionRelativeTo={chipBarLayout}
        renderOption={(option: Project) => (
          <View className="flex flex-row gap-4 border-b border-slate-300 px-4 py-2">
            <View
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: option.color }}
            >
              <MaterialCommunityIcons
                name={option.icon as any}
                color={"white"}
                size={16}
              />
            </View>
            <Text className="text-xl" style={{ color: option.color }}>
              {option.name}
            </Text>
          </View>
        )}
        onClose={() => setProjectEditModalVisible(false)}
        onSelect={(selected: Project) => {
          editProjectMutation.mutate(selected);
          setProjectEditModalVisible(false);
        }}
      />
      {/* Tags Edit */}
      <TagModal
        tags={entryQuery.data?.tags || []}
        visible={tagModalVisible}
        backgroundColor="#f0f0f0"
        height={300}
        positionRelativeTo={chipBarLayout}
        onClose={() => {
          setTagModalVisible(false);
          if (!entryQuery.data) {
            return;
          }
          editTagsMutation.mutate(entryQuery.data.tags);
        }}
        onChange={(tags) => {
          qc.setQueryData(["entries", "current"], {
            ...entryQuery.data,
            tags,
          });
        }}
      />
      <ChipBar
        key={entryQuery.data?.id} // TODO: Key is just here to make bar not be shared. change this when adding animations
      >
        {/* Entry doesn't exist */}
        {!props.entry && (
          <>
            {/* Start from empty */}
            <ActionChip
              text="Start empty"
              leadingIcon="play-arrow"
              onPress={() => startEntryMutation.mutate(null)}
            />
            {/* Start from project */}
            <ActionChip
              text="Start from project"
              leadingIcon="play-arrow"
              onPress={() => setProjectStartModalVisible(true)}
            />
            {/* Restore from trash */}
            <ActionChip
              text="Restore"
              leadingIcon="restore-from-trash"
              onPress={() => restoreEntryMutation.mutate()}
              hide={!binQuery.data}
            />
          </>
        )}
        {/* Entry exists */}
        {entryQuery.data && (
          <>
            {/* Projects */}
            <ActionChip
              backgroundColor={entryQuery.data.project_color || "transparent"}
              borderColor={
                entryQuery.data.project_id ? "transparent" : undefined
              }
              textColor={entryQuery.data.project_id ? "#eeeeee" : undefined}
              trailingIconColor={
                entryQuery.data.project_id ? "#eeeeee" : undefined
              }
              text={entryQuery.data.project_name || "Project"}
              trailingIcon={entryQuery.data.project_id ? "close" : "add"}
              onPress={() => {
                if (entryQuery.data?.project_id) {
                  editProjectMutation.mutate(null);
                } else {
                  setProjectEditModalVisible(true);
                }
              }}
            />
            {/* Tags */}
            <ActionChip
              text="Tags"
              backgroundColor={
                entryQuery.data?.tags.length > 0 ? "#9e8e9e" : "transparent"
              }
              borderColor={
                entryQuery.data?.tags.length > 0 ? "transparent" : undefined
              }
              textColor={
                entryQuery.data?.tags.length > 0 ? "#eeeeee" : undefined
              }
              trailingIconColor={
                entryQuery.data?.tags.length > 0 ? "#eeeeee" : undefined
              }
              trailingIcon={entryQuery.data?.tags.length > 0 ? "edit" : "add"}
              onPress={() => setTagModalVisible(true)}
            />
            {/* Stop */}
            <ActionChip
              backgroundColor="#ef4444"
              borderColor="transparent"
              textColor="#eeeeee"
              trailingIconColor="#eeeeee"
              text="Stop"
              trailingIcon="stop-circle"
              onPress={stopMutation.mutate}
            />
            {/* Fill to last stop */}
            <ActionChip
              borderColor={
                fillToLastStopMutation.isPending ? "#aaaaaa" : undefined
              }
              textColor={
                fillToLastStopMutation.isPending ? "#aaaaaa" : undefined
              }
              leadingIconColor={
                fillToLastStopMutation.isPending ? "#aaaaaa" : undefined
              }
              text="Fill to last stop"
              leadingIcon="arrow-circle-left"
              onPress={fillToLastStopMutation.mutate}
              hide={
                !!prevQuery.data &&
                prevQuery.data?.stop === entryQuery.data.start &&
                !fillToLastStopMutation.isPending
              }
            />
            {/* Set start to now */}
            <ActionChip
              borderColor={
                setStartToNowMutation.isPending ? "#aaaaaa" : undefined
              }
              textColor={
                setStartToNowMutation.isPending ? "#aaaaaa" : undefined
              }
              leadingIconColor={
                setStartToNowMutation.isPending ? "#aaaaaa" : undefined
              }
              text="Set start to now"
              leadingIcon="start"
              onPress={setStartToNowMutation.mutate}
            />
            {/* Make Template */}
            <ActionChip
              borderColor={
                addTemplateMutation.isPending ? "#aaaaaa" : undefined
              }
              textColor={addTemplateMutation.isPending ? "#aaaaaa" : undefined}
              leadingIconColor={
                addTemplateMutation.isPending ? "#aaaaaa" : undefined
              }
              text="Template"
              leadingIcon="add-circle"
              onPress={() => {
                addTemplateMutation.mutate({
                  name: "",
                  project_id: entryQuery.data?.project_id || null,
                  description: entryQuery.data?.description || "",
                  tags: entryQuery.data?.tags || [],
                });
              }}
              hide={templateMade && !addTemplateMutation.isPending}
            />
            {/* Delete Entry */}
            <ActionChip
              borderColor="transparent"
              backgroundColor="#444444"
              textColor="#eeeeee"
              leadingIconColor="#eeeeee"
              text="Delete"
              leadingIcon="delete"
              onPress={deleteMutation.mutate}
            />
          </>
        )}
      </ChipBar>
    </View>
  );
}
