import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import { Animated, Text, TouchableNativeFeedback, View } from "react-native";
import TimerText from "@/components/TimerText";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  useCreateEntryMutation,
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
import { TopSheet } from "./TopSheet";
import { Icon } from "./Icon";
import { useStateAsRef } from "@/hooks/misc";
import ProjectChip from "./ProjectChip";
import TagsChip from "./TagsChip";
import { useAnimatedValue } from "@/hooks/animtedHooks";
import ConfirmModal from "./ConfirmModal";
import { Data } from "@/apis/data";

type EntryEditorSheetRef = {
  open: () => void;
  close: () => void;
};

export namespace EntryEditorSheet {
  export type Ref = EntryEditorSheetRef;
}

export const EntryEditorSheet = React.forwardRef(function (
  props: {
    onOpen: () => void;
    onClose: () => void;
    onSave?: () => void;
    onDiscard?: () => void;
    entry?: Omit<EntryWithProject, "id"> & { id: number | null };
    hideTimerWhenClosed?: boolean;
    hideDeleteButton?: boolean;
  },
  ref: React.Ref<EntryEditorSheetRef>,
) {
  const closedHeight = props.hideTimerWhenClosed ? -50 : 210;
  const openHeight = props.hideDeleteButton ? 610 : 650;
  const openThreshold = 400;

  const [modalOpen, setModalOpen] = useState(false);
  const ongoingQuery = useOngoing();

  const createEntryMutation = useCreateEntryMutation();
  const editEntryMutation = useEditEntryMutation();
  const deleteEntryMutation = useDeleteEntryMutation(true);

  const [displayEntry, setDisplayEntry] = useState(
    props.entry ?? ongoingQuery.data,
  );
  useEffect(() => {
    setDisplayEntry(props.entry ?? ongoingQuery.data);
    displayEntryHasChanges.current = !!props.entry && props.entry.id === null;
  }, [
    props.entry?.id ?? ongoingQuery.data?.id,
    props.entry === undefined,
    ongoingQuery.data?.at,
    props.entry?.at,
  ]);
  const displayEntryHasChanges = useRef(false);
  const [saveChangesModalVisible, setSaveChangesModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const displayEntryRef = useStateAsRef(displayEntry);
  const saveDisplayEntry = (callback?: () => void) => {
    if (!displayEntryRef.current) return;
    if (displayEntryRef.current.id === null) {
      createEntryMutation.mutate(displayEntryRef.current as EntryWithProject, {
        onSettled: callback,
      });
    } else {
      editEntryMutation.mutate(displayEntryRef.current as EntryWithProject, {
        onSettled: callback,
      });
    }
  };

  const topSheetAnimatedValue = useAnimatedValue(closedHeight);
  const chipsAnimatedValue = topSheetAnimatedValue.interpolate({
    inputRange: [closedHeight, openThreshold],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const [chipsEnabled, setChipsEnabled] = useState(true);

  const topSheetRef = useRef<TopSheet.Ref | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        topSheetRef.current?.setHeightTo(openHeight);
      },
      close: () => {
        topSheetRef.current?.setHeightTo(closedHeight);
      },
    }),
    [],
  );

  return (
    <TopSheet
      ref={topSheetRef}
      stableHeights={[
        {
          stabilizeTo: closedHeight,
          whenAbove: null,
        },
        {
          stabilizeTo: openHeight,
          whenAbove: openThreshold,
        },
      ]}
      flickMultiplier={200}
      give={0}
      contentFixed={true}
      onPanStart={() => {
        setChipsEnabled(false);
      }}
      onStabilize={(h) => {
        setModalOpen(h > closedHeight);
        if (h > closedHeight) {
          props.onOpen();
        } else {
          setChipsEnabled(true);
          props.onClose();
          if (displayEntryHasChanges.current) {
            setSaveChangesModalVisible(true);
          }
        }
      }}
      disablePan={!modalOpen && (!!props.entry || !ongoingQuery.data)}
      animatedValue={topSheetAnimatedValue}
    >
      <ConfirmModal
        title="Save changes to entry?"
        leftText="Discard"
        rightText="Save"
        visible={saveChangesModalVisible}
        onLeft={() => {
          setDisplayEntry(props.entry ?? ongoingQuery.data);
          setSaveChangesModalVisible(false);
          props.onDiscard?.();
        }}
        onRight={() => {
          saveDisplayEntry(props.onSave);
          setSaveChangesModalVisible(false);
        }}
      />
      <ConfirmModal
        title="Delete entry?"
        leftText="Cancel"
        rightText="Delete"
        visible={deleteModalVisible}
        onLeft={() => {
          setDeleteModalVisible(false);
        }}
        onRight={() => {
          if (!displayEntry || displayEntry.id === null) return;
          topSheetRef.current?.setHeightTo(closedHeight, props.onSave);
          saveDisplayEntry(() => {
            deleteEntryMutation.mutate(displayEntry as EntryWithProject);
          });
          setDeleteModalVisible(false);
        }}
        rightClassName="text-red-500 text-xl font-bold"
      />
      <TimerContent
        hideDeleteButton={props.hideDeleteButton}
        entry={displayEntry ? { ...displayEntry, id: 0 } : null}
        onEditEntry={(entry: Partial<EntryWithProject>) => {
          if (!displayEntry) return;
          displayEntryHasChanges.current = true;
          if (!modalOpen) {
            if (displayEntry.id !== null) {
              editEntryMutation.mutate({
                ...(displayEntry as EntryWithProject),
                ...entry,
              });
            }
          } else {
            setDisplayEntry({ ...displayEntry, ...entry });
          }
        }}
        chipsAnimatedValue={chipsAnimatedValue}
        chipsEnabled={chipsEnabled}
        onSave={() => {
          displayEntryHasChanges.current = false;
          saveDisplayEntry();
          topSheetRef.current?.setHeightTo(closedHeight, props.onSave);
        }}
        onDiscard={() => {
          displayEntryHasChanges.current = false;
          setDisplayEntry(props.entry ?? ongoingQuery.data);
          topSheetRef.current?.setHeightTo(closedHeight, props.onDiscard);
        }}
        onDelete={() => {
          displayEntryHasChanges.current = false;
          setDeleteModalVisible(true);
        }}
      />
    </TopSheet>
  );
});

function TimerContent(props: {
  entry: EntryWithProject | null;
  onEditEntry: (entry: Partial<EntryWithProject>) => void;
  chipsAnimatedValue: Animated.AnimatedInterpolation<number>;
  chipsEnabled: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onDelete: () => void;
  hideDeleteButton?: boolean;
}) {
  const stopEntry = () => {
    props.onEditEntry?.({ stop: Dates.toISOExtended(new Date()) });
  };
  const prevEntry = useQuery({
    queryKey: ["entries", props.entry?.id || null, "prev"],
    queryFn: async () => {
      if (!props.entry) return null;
      return Data.Entries.getLastStopped(props.entry.start);
    },
  });
  const setStartToLastStop = () => {
    if (!prevEntry.data || !prevEntry.data.stop) return;
    props.onEditEntry?.({ start: prevEntry.data.stop });
  };

  return (
    <View className="pt-4">
      <View className="z-20 w-full bg-white">
        {!props.entry && (
          <View className="flex items-center justify-between">
            <View className="flex h-32 flex-grow items-center justify-center">
              <Text className="px-8 text-4xl color-gray-400">
                No running entry
              </Text>
            </View>
          </View>
        )}
        {props.entry && (
          <View className="h-32">
            <View className="flex flex-row items-end justify-between px-4">
              <View>
                <View className="flex flex-row items-center gap-2">
                  <MaterialIcons
                    name="edit"
                    size={16}
                    color={props.entry.description ? "black" : "#a8a29e"}
                    className="pb-2"
                  />
                  <StatefulTextInput
                    className="pb-2 text-2xl"
                    value={props.entry.description || ""}
                    placeholder="Enter description..."
                    placeholderClassName="color-stone-400"
                    style={{ fontWeight: "bold" }}
                    placeholderStyle={{ fontWeight: "normal" }}
                    onChange={(t) => {
                      const text = t.trim();
                      props.onEditEntry?.({ description: text || null });
                    }}
                  />
                </View>
                <TimerText
                  className="text-6xl"
                  startTime={new Date(props.entry.start)}
                  stopTime={
                    props.entry.stop ? new Date(props.entry.stop) : undefined
                  }
                />
              </View>
              <View
                className={
                  "flex aspect-square w-24 items-center justify-center rounded-full shadow-md shadow-black"
                }
                style={{
                  backgroundColor: props.entry.project_color || "#cccccc",
                }}
              >
                <Icon
                  name={props.entry.project_icon as any}
                  color="white"
                  size={44}
                />
              </View>
            </View>
            {props.entry?.tags.length > 0 && (
              <View className="flex flex-row items-center gap-2 px-4">
                <MaterialCommunityIcons name="tag" size={14} color="#a8a29e" />
                <Text className="font-light italic text-gray-400">
                  {props.entry?.tags.join(", ") || ""}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
      <Animated.View
        className="z-10 h-16 w-full bg-white"
        style={{
          transform: [
            { translateY: Animated.multiply(props.chipsAnimatedValue, -100) },
          ],
        }}
      >
        <ClosedChips enabled={props.chipsEnabled} />
      </Animated.View>
      <View className="absolute top-40">
        <View className="flex-row">
          <View className="flex-grow gap-2 px-6 pb-4">
            <Text className="text-2xl font-bold">Project</Text>
            <View className="flex-row px-2">
              <ProjectChip
                project={
                  props.entry?.project_id
                    ? ({
                        id: props.entry.project_id,
                        name: props.entry.project_name,
                        icon: props.entry.project_icon,
                        color: props.entry.project_color,
                        at: "",
                        active: true,
                      } as Project)
                    : null
                }
                onSelect={(project) => {
                  props.onEditEntry?.({
                    project_id: project?.id || null,
                    project_name: project?.name || null,
                    project_icon: project?.icon || null,
                    project_color: project?.color || null,
                  });
                }}
              />
            </View>
          </View>
          <View className="flex-grow gap-2 pb-4">
            <Text className="text-2xl font-bold">Tags</Text>
            <View className="flex-row px-2">
              <TagsChip
                tags={props.entry?.tags || []}
                onChange={(tags) => {
                  props.onEditEntry?.({ tags });
                }}
              />
            </View>
          </View>
        </View>
        <View className="px-4">
          <DateTimeEditor
            date={props.entry ? new Date(props.entry.start) : new Date()}
            mustBeBefore={
              props.entry?.stop ? new Date(props.entry.stop) : undefined
            }
            onDateChange={(date) => {
              props.onEditEntry?.({ start: Dates.toISOExtended(date) });
            }}
            text="Start"
            className="pb-1"
          />
          <View className="flex w-full items-end">
            <View className="overflow-hidden rounded-sm">
              <TouchableNativeFeedback onPress={setStartToLastStop}>
                <View>
                  <Text className="px-2 py-0.5 text-sm font-semibold text-slate-600">
                    Fill to last stop
                  </Text>
                </View>
              </TouchableNativeFeedback>
            </View>
          </View>
          <DateTimeEditor
            date={props.entry?.stop ? new Date(props.entry.stop) : new Date()}
            onDateChange={(date) => {
              props.onEditEntry?.({ stop: Dates.toISOExtended(date) });
            }}
            text="Stop"
            className="pb-1"
            disabled={!props.entry || !props.entry.stop}
            mustBeAfter={props.entry ? new Date(props.entry.start) : undefined}
          />
          <View className="flex w-full items-end pb-6">
            <View className="overflow-hidden rounded-sm">
              <TouchableNativeFeedback onPress={stopEntry}>
                <View>
                  <Text className="px-2 py-0.5 text-sm font-semibold text-red-500">
                    Stop Timer
                  </Text>
                </View>
              </TouchableNativeFeedback>
            </View>
          </View>
          <View className="w-full flex-row justify-between">
            <View className="overflow-hidden rounded-full">
              <TouchableNativeFeedback onPress={props.onDiscard}>
                <View className="w-24 items-center justify-center py-2">
                  <Text className="text-lg font-semibold text-gray-700">
                    Discard
                  </Text>
                </View>
              </TouchableNativeFeedback>
            </View>
            <View className="overflow-hidden rounded-full">
              <TouchableNativeFeedback onPress={props.onSave}>
                <View className="w-24 items-center justify-center py-2">
                  <Text className="text-lg font-bold">Save</Text>
                </View>
              </TouchableNativeFeedback>
            </View>
          </View>
          {!props.hideDeleteButton && (
            <View className="w-full flex-row items-center justify-center">
              <View className="overflow-hidden rounded-full">
                <TouchableNativeFeedback onPress={props.onDelete}>
                  <View className="w-36 items-center justify-center py-2">
                    <Text className="text-lg font-bold text-red-600">
                      Delete Entry
                    </Text>
                  </View>
                </TouchableNativeFeedback>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function ClosedChips(props: { enabled: boolean }) {
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

  const ongoingQuery = useOngoing();
  const prevQuery = usePrevious();
  const binQuery = useBin();
  const projectsQuery = useProjects();

  const startProjectMutation = useStartProjectMutation();
  const stopMutation = useStopCurrentMutation();
  const deleteMutation = useDeleteEntryMutation(true);
  const restoreEntryMutation = useRestoreEntryMutation();
  const editMutation = useEditEntryMutation();
  const addTemplateMutation = useAddTemplateMutation();

  const editProject = (project: Project | null) => {
    if (!ongoingQuery.data) {
      return;
    }
    editMutation.mutate({
      ...ongoingQuery.data,
      project_id: project?.id || null,
      project_name: project?.name || null,
      project_icon: project?.icon || null,
      project_color: project?.color || null,
    });
  };
  const editTags = (tags: string[]) => {
    if (!ongoingQuery.data) {
      return;
    }
    editMutation.mutate({
      ...ongoingQuery.data,
      tags,
    });
  };
  const fillToLastStop = () => {
    if (!ongoingQuery.data || !prevQuery.data || !prevQuery.data.stop) {
      return;
    }
    editMutation.mutate({ ...ongoingQuery.data, start: prevQuery.data.stop });
  };
  const setStartToNow = () => {
    if (!ongoingQuery.data) {
      return;
    }
    editMutation.mutate({
      ...ongoingQuery.data,
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
        tags={ongoingQuery.data?.tags || []}
        visible={tagModalVisible}
        backgroundColor="#f0f0f0"
        height={300}
        positionRelativeTo={chipBarLayout}
        onClose={() => {
          setTagModalVisible(false);
          if (!ongoingQuery.data) {
            return;
          }
          editTags(ongoingQuery.data.tags);
        }}
        onChange={(tags) => {
          qc.setQueryData(["entries", "current"], {
            ...ongoingQuery.data,
            tags,
          });
        }}
      />
      <ChipBar
        key={ongoingQuery.data?.id} // TODO: Key is just here to make bar not be shared. change this when adding animations
      >
        {/* Entry doesn't exist */}
        {!ongoingQuery.data && (
          <>
            {/* Start from empty */}
            <ActionChip
              key="start-empty"
              text="Start empty"
              leadingIcon="play-arrow"
              onPress={() => startProjectMutation.mutate(null)}
              disabled={!props.enabled}
            />
            {/* Start from project */}
            <ActionChip
              key="start-project"
              text="Start from project"
              leadingIcon="play-arrow"
              onPress={() => setProjectStartModalVisible(true)}
              disabled={!props.enabled}
            />
            {/* Restore from trash */}
            <ActionChip
              key="restore"
              text="Restore"
              leadingIcon="restore-from-trash"
              onPress={() => restoreEntryMutation.mutate()}
              hide={!binQuery.data}
              disabled={!props.enabled}
            />
          </>
        )}
        {/* Entry exists */}
        {ongoingQuery.data && (
          <>
            {/* Projects */}
            <ActionChip
              key="project-edit"
              backgroundColor={ongoingQuery.data.project_color || "transparent"}
              borderColor={
                ongoingQuery.data.project_id ? "transparent" : undefined
              }
              textColor={ongoingQuery.data.project_id ? "#eeeeee" : undefined}
              trailingIconColor={
                ongoingQuery.data.project_id ? "#eeeeee" : undefined
              }
              text={ongoingQuery.data.project_name || "Project"}
              trailingIcon={ongoingQuery.data.project_id ? "close" : "add"}
              onPress={() => {
                if (ongoingQuery.data?.project_id) {
                  editProject(null);
                } else {
                  setProjectEditModalVisible(true);
                }
              }}
              disabled={!props.enabled}
            />
            {/* Tags */}
            <ActionChip
              key="tags-edit"
              text="Tags"
              backgroundColor={
                ongoingQuery.data?.tags.length > 0 ? "#9e8e9e" : "transparent"
              }
              borderColor={
                ongoingQuery.data?.tags.length > 0 ? "transparent" : undefined
              }
              textColor={
                ongoingQuery.data?.tags.length > 0 ? "#eeeeee" : undefined
              }
              trailingIconColor={
                ongoingQuery.data?.tags.length > 0 ? "#eeeeee" : undefined
              }
              trailingIcon={ongoingQuery.data?.tags.length > 0 ? "edit" : "add"}
              onPress={() => setTagModalVisible(true)}
              disabled={!props.enabled}
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
              hide={ongoingQuery.data.stop !== null}
              disabled={!props.enabled}
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
                prevQuery.data?.stop === ongoingQuery.data.start &&
                !editMutation.isPending
              }
              disabled={!props.enabled}
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
              disabled={!props.enabled}
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
                setTemplateMade(true);
                addTemplateMutation.mutate({
                  template: {
                    name: "",
                    project_id: ongoingQuery.data?.project_id || null,
                    description: ongoingQuery.data?.description || "",
                    tags: ongoingQuery.data?.tags || [],
                  },
                  num_cols: 3,
                });
              }}
              hide={templateMade && !addTemplateMutation.isPending}
              disabled={!props.enabled}
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
                if (!ongoingQuery.data) return;
                deleteMutation.mutate(ongoingQuery.data);
              }}
              disabled={!props.enabled}
            />
          </>
        )}
      </ChipBar>
    </View>
  );
}
