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
import {
  useBin,
  useDeleteEntryMutation,
  useEditEntryMutation,
  useOngoing,
  usePrevious,
  useRestoreEntryMutation,
  useStartProjectMutation,
  useStopCurrentMutation,
} from "@/hooks/entryQueries";
import { useProjects } from "@/hooks/projectQueries";
import { useAddTemplateMutation } from "@/hooks/templateQueries";
import TopSheet from "../TopSheet";
import { Icon } from "../Icon";

export default function Timer(props: {
  onOpen: () => void;
  onClose: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const ongoingQuery = useOngoing();

  return (
    <TopSheet
      stableHeights={[
        {
          stabilizeTo: 200,
          whenAbove: null,
        },
        {
          stabilizeTo: 600,
          whenAbove: 400,
        },
      ]}
      flickMultiplier={200}
      give={0}
      contentFixed={true}
      onStabilize={(h) => {
        setModalOpen(h > 200);
        if (h > 200) {
          props.onOpen();
        } else {
          props.onClose();
        }
      }}
      disablePan={!modalOpen && !ongoingQuery.data}
    >
      <TimerContent useLatestEntryIfNoOngoing={modalOpen} />
    </TopSheet>
  );
}

function TimerContent(props: { useLatestEntryIfNoOngoing: boolean }) {
  const qc = useQueryClient();

  const ongoingQuery = useOngoing();
  const lastStoppedQuery = usePrevious();
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

  const editMutation = useEditEntryMutation();
  const stopMutation = useStopCurrentMutation();

  const fillToLastStop = () => {
    if (!entryQuery.data || !prevQuery.data || !prevQuery.data.stop) {
      return;
    }
    editMutation.mutate({ ...entryQuery.data, start: prevQuery.data.stop });
  };

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
                    if (!entryQuery.data) return;
                    editMutation.mutate({
                      ...entryQuery.data,
                      description: text || null,
                    });
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
              <Icon
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
            qc.setQueryData(["entries", entryQuery.data.id], {
              ...entryQuery.data,
              start: Dates.toISOExtended(date),
            });
          }}
          text="Start"
          className="pb-1"
        />
        <View className="flex w-full items-end">
          <View className="overflow-hidden rounded-sm">
            <TouchableNativeFeedback onPress={fillToLastStop}>
              <View>
                <Text className="px-2 py-0.5 text-sm font-semibold text-slate-600">
                  Fill to last stop
                </Text>
              </View>
            </TouchableNativeFeedback>
          </View>
        </View>
        <DateTimeEditor
          date={
            entryQuery.data?.stop ? new Date(entryQuery.data.stop) : new Date()
          }
          onDateChange={(date) => {
            if (!entryQuery.data) {
              return;
            }
            qc.setQueryData(["entries", entryQuery.data.id], {
              ...entryQuery.data,
              stop: Dates.toISOExtended(date),
            });
          }}
          text="Stop"
          className="pb-1"
          disabled={!entryQuery.data || !entryQuery.data.stop}
          mustBeAfter={
            entryQuery.data ? new Date(entryQuery.data.start) : undefined
          }
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

  const binQuery = useBin();
  const projectsQuery = useProjects();

  const startProjectMutation = useStartProjectMutation();
  const stopMutation = useStopCurrentMutation();
  const deleteMutation = useDeleteEntryMutation(true);
  const restoreEntryMutation = useRestoreEntryMutation();
  const editMutation = useEditEntryMutation();
  const addTemplateMutation = useAddTemplateMutation();

  const editProject = (project: Project | null) => {
    if (!entryQuery.data) {
      return;
    }
    editMutation.mutate({
      ...entryQuery.data,
      project_id: project?.id || null,
      project_name: project?.name || null,
      project_icon: project?.icon || null,
      project_color: project?.color || null,
    });
  };
  const editTags = (tags: string[]) => {
    if (!entryQuery.data) {
      return;
    }
    editMutation.mutate({
      ...entryQuery.data,
      tags,
    });
  };
  const fillToLastStop = () => {
    if (!entryQuery.data || !prevQuery.data || !prevQuery.data.stop) {
      return;
    }
    editMutation.mutate({ ...entryQuery.data, start: prevQuery.data.stop });
  };
  const setStartToNow = () => {
    if (!entryQuery.data) {
      return;
    }
    editMutation.mutate({
      ...entryQuery.data,
      start: Dates.toISOExtended(new Date()),
    });
  };

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
              <Icon name={option.icon as any} color={"white"} size={16} />
            </View>
            <Text className="text-xl" style={{ color: option.color }}>
              {option.name}
            </Text>
          </View>
        )}
        onClose={() => setProjectStartModalVisible(false)}
        onSelect={(selected: Project) => {
          startProjectMutation.mutate(selected);
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
              <Icon name={option.icon as any} color={"white"} size={16} />
            </View>
            <Text className="text-xl" style={{ color: option.color }}>
              {option.name}
            </Text>
          </View>
        )}
        onClose={() => setProjectEditModalVisible(false)}
        onSelect={(selected: Project) => {
          editProject(selected);
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
          editTags(entryQuery.data.tags);
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
              key="start-empty"
              text="Start empty"
              leadingIcon="play-arrow"
              onPress={() => startProjectMutation.mutate(null)}
            />
            {/* Start from project */}
            <ActionChip
              key="start-project"
              text="Start from project"
              leadingIcon="play-arrow"
              onPress={() => setProjectStartModalVisible(true)}
            />
            {/* Restore from trash */}
            <ActionChip
              key="restore"
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
              key="project-edit"
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
                  editProject(null);
                } else {
                  setProjectEditModalVisible(true);
                }
              }}
            />
            {/* Tags */}
            <ActionChip
              key="tags-edit"
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
              key="stop"
              backgroundColor="#ef4444"
              borderColor="transparent"
              textColor="#eeeeee"
              trailingIconColor="#eeeeee"
              text="Stop"
              trailingIcon="stop-circle"
              onPress={stopMutation.mutate}
              hide={entryQuery.data.stop !== null}
            />
            {/* Fill to last stop */}
            <ActionChip
              key="fill"
              borderColor={editMutation.isPending ? "#aaaaaa" : undefined}
              textColor={editMutation.isPending ? "#aaaaaa" : undefined}
              leadingIconColor={editMutation.isPending ? "#aaaaaa" : undefined}
              text="Fill to last stop"
              leadingIcon="arrow-circle-left"
              onPress={fillToLastStop}
              hide={
                !!prevQuery.data &&
                prevQuery.data?.stop === entryQuery.data.start &&
                !editMutation.isPending
              }
            />
            {/* Set start to now */}
            <ActionChip
              key="set-start-to-now"
              borderColor={editMutation.isPending ? "#aaaaaa" : undefined}
              textColor={editMutation.isPending ? "#aaaaaa" : undefined}
              leadingIconColor={editMutation.isPending ? "#aaaaaa" : undefined}
              text="Set start to now"
              leadingIcon="start"
              onPress={setStartToNow}
            />
            {/* Make Template */}
            <ActionChip
              key="make-template"
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
                  template: {
                    name: "",
                    project_id: entryQuery.data?.project_id || null,
                    description: entryQuery.data?.description || "",
                    tags: entryQuery.data?.tags || [],
                  },
                  num_cols: 3,
                });
              }}
              hide={templateMade && !addTemplateMutation.isPending}
            />
            {/* Delete Entry */}
            <ActionChip
              key="delete"
              borderColor="transparent"
              backgroundColor="#444444"
              textColor="#eeeeee"
              leadingIconColor="#eeeeee"
              text="Delete"
              leadingIcon="delete"
              onPress={() => {
                if (!entryQuery.data) return;
                deleteMutation.mutate(entryQuery.data);
              }}
            />
          </>
        )}
      </ChipBar>
    </View>
  );
}
