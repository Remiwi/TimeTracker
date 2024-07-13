import { useRef, useState } from "react";
import { Text, TouchableNativeFeedback, View } from "react-native";
import TimerText from "@/components/TimerText";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Data } from "@/apis/data";
import { Project } from "@/apis/types";
import { Dates } from "@/utils/dates";
import ChipBar from "@/components/ChipBar";
import ActionChip from "@/components/ActionChip";
import ListModal from "@/components/ListModal";
import { useAtom } from "jotai";
import { templateMadeAtom } from "@/utils/atoms";
import TagModal from "@/components/TagModal";
import DateTimeEditor from "@/components/DatetimeEditor";
import StatefulTextInput from "@/components/StatefulTextInput";

export default function Timer() {
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

  const [templateMade, setTemplateMade] = useAtom(templateMadeAtom);

  const qc = useQueryClient();

  const ongoingQuery = useQuery({
    queryKey: ["entries", "current"],
    queryFn: Data.Entries.getCurrentWithProject,
  });

  const previousQuery = useQuery({
    queryKey: ["entries", "previous"],
    queryFn: Data.Entries.getLastStopped,
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
    mutationFn: async (project: Project | null) => {
      await Data.Entries.start({
        project_id: project?.id || null,
      });
    },
    onMutate: (project: Project | null) => {
      setTemplateMade(false);
      qc.setQueryData(["entries", "current"], {
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
      });
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      ongoingQuery.refetch();
    },
  });

  const restoreEntryMutation = useMutation({
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
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      ongoingQuery.refetch();
      previousQuery.refetch();
      binQuery.refetch();
    },
  });

  const editDescriptionMutation = useMutation({
    mutationFn: async (description: string | null) => {
      console.log(description);
      if (!ongoingQuery.data) {
        return;
      }
      await Data.Entries.edit({
        id: ongoingQuery.data.id,
        description,
      });
    },
    onMutate: (description: string | null) => {
      setTemplateMade(false);
      qc.setQueryData(["entries", "current"], {
        ...ongoingQuery.data,
        description,
      });
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      ongoingQuery.refetch();
    },
  });

  const editProjectMutation = useMutation({
    mutationFn: async (project: Project | null) => {
      if (!ongoingQuery.data) {
        return;
      }
      await Data.Entries.edit({
        id: ongoingQuery.data.id,
        project_id: project?.id || null,
      });
    },
    onMutate: (project: Project | null) => {
      setTemplateMade(false);
      qc.setQueryData(["entries", "current"], {
        ...ongoingQuery.data,
        project_id: project?.id || null,
        project_name: project?.name || null,
        project_icon: project?.icon || null,
        project_color: project?.color || null,
      });
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      ongoingQuery.refetch();
    },
  });

  const editTagsMutation = useMutation({
    mutationFn: async (tags: string[]) => {
      if (!ongoingQuery.data) {
        return;
      }
      await Data.Entries.edit({
        id: ongoingQuery.data.id,
        tags,
      });
    },
    onMutate: (tags: string[]) => {
      setTemplateMade(false);
      qc.setQueryData(["entries", "current"], {
        ...ongoingQuery.data,
        tags,
      });
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      ongoingQuery.refetch();
    },
  });

  const stopMutation = useMutation({
    mutationFn: Data.Entries.stopCurrent,
    onMutate: () => {
      setTemplateMade(false);
      qc.setQueryData(["entries", "previous"], ongoingQuery.data);
      qc.setQueryData(["entries", "current"], null);
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      previousQuery.refetch();
      ongoingQuery.refetch();
    },
  });

  const fillToLastStopMutation = useMutation({
    mutationFn: Data.Entries.setCurrentStartToPrevStop,
    onMutate: () => {
      qc.setQueryData(["entries", "current"], {
        ...ongoingQuery.data,
        start: previousQuery.data?.stop,
      });
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      ongoingQuery.refetch();
    },
  });

  const setStartToNowMutation = useMutation({
    mutationFn: async () => {
      if (!ongoingQuery.data) {
        return;
      }
      await Data.Entries.edit({
        id: ongoingQuery.data?.id,
        start: Dates.toISOExtended(new Date()),
      });
    },
    onMutate: () => {
      qc.setQueryData(["entries", "current"], {
        ...ongoingQuery.data,
        start: Dates.toISOExtended(new Date()),
      });
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      ongoingQuery.refetch();
    },
  });

  const addTemplateMutation = useMutation({
    mutationFn: Data.Templates.create,
    onMutate: () => {
      setTemplateMade(true);
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: Data.Entries.deleteCurrent,
    onMutate: () => {
      setTemplateMade(false);
      qc.setQueryData(["entries", "bin"], ongoingQuery.data);
      qc.setQueryData(["entries", "current"], null);
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      ongoingQuery.refetch();
      binQuery.refetch();
    },
  });

  const start = ongoingQuery.data
    ? new Date(ongoingQuery.data.start)
    : undefined;

  return (
    <View className="pt-4">
      {!ongoingQuery.data && (
        <View className="flex items-center justify-between">
          <View className="flex h-32 flex-grow items-center justify-center">
            <Text className="px-8 text-4xl color-gray-400">
              No running entry
            </Text>
          </View>
          <View
            className="relative w-full"
            ref={chipBarRef}
            onLayout={(event) => {
              // var { width, height } = event.nativeEvent.layout;
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
            <ChipBar>
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
            </ChipBar>
          </View>
        </View>
      )}
      {ongoingQuery.data && (
        <>
          <View className="h-32">
            <View className="flex flex-row items-end justify-between px-4">
              <View>
                <View className="flex flex-row items-center gap-2">
                  <MaterialIcons
                    name="edit"
                    size={16}
                    color={ongoingQuery.data.description ? "black" : "#a8a29e"}
                    className="pb-2"
                  />
                  <StatefulTextInput
                    className="pb-2 text-2xl"
                    value={ongoingQuery.data.description || ""}
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
                <TimerText className="text-6xl" startTime={start} />
              </View>
              <View
                className={
                  "flex aspect-square w-24 items-center justify-center rounded-full shadow-md shadow-black"
                }
                style={{
                  backgroundColor: ongoingQuery.data.project_color || "#cccccc",
                }}
              >
                <MaterialCommunityIcons
                  name={ongoingQuery.data.project_icon as any}
                  color="white"
                  size={44}
                />
              </View>
            </View>
            {ongoingQuery.data?.tags.length > 0 && (
              <View className="flex flex-row items-center gap-2 px-4">
                <MaterialCommunityIcons name="tag" size={14} color="#a8a29e" />
                <Text className="font-light italic text-gray-400">
                  {ongoingQuery.data?.tags.join(", ") || ""}
                </Text>
              </View>
            )}
          </View>
          <View
            className="relative w-full"
            ref={chipBarRef}
            onLayout={(event) => {
              // var { width, height } = event.nativeEvent.layout;
              if (chipBarRef.current === null) return;
              chipBarRef.current.measure((rx, ry, width, height, x, y) => {
                setChipBarLayout({ x, y: y + 10, width, height });
              });
            }}
          >
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
            {/* Tags */}
            <TagModal
              tags={ongoingQuery.data.tags}
              visible={tagModalVisible}
              backgroundColor="#f0f0f0"
              height={300}
              positionRelativeTo={chipBarLayout}
              onClose={() => {
                setTagModalVisible(false);
                if (!ongoingQuery.data) {
                  return;
                }
                editTagsMutation.mutate(ongoingQuery.data.tags);
              }}
              onChange={(tags) => {
                qc.setQueryData(["entries", "current"], {
                  ...ongoingQuery.data,
                  tags,
                });
              }}
            />
            <ChipBar>
              {/* Projects */}
              <ActionChip
                backgroundColor={
                  ongoingQuery.data.project_color || "transparent"
                }
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
                trailingIcon={
                  ongoingQuery.data?.tags.length > 0 ? "edit" : "add"
                }
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
                  !!previousQuery.data &&
                  previousQuery.data?.stop === ongoingQuery.data.start &&
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
                textColor={
                  addTemplateMutation.isPending ? "#aaaaaa" : undefined
                }
                leadingIconColor={
                  addTemplateMutation.isPending ? "#aaaaaa" : undefined
                }
                text="Template"
                leadingIcon="add-circle"
                onPress={() => {
                  addTemplateMutation.mutate({
                    name: "",
                    project_id: ongoingQuery.data?.project_id || null,
                    description: ongoingQuery.data?.description || "",
                    tags: ongoingQuery.data?.tags || [],
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
            </ChipBar>
          </View>
        </>
      )}
      <View className="px-4 pt-4">
        <DateTimeEditor
          date={
            ongoingQuery.data ? new Date(ongoingQuery.data.start) : new Date()
          }
          onDateChange={(date) => {
            if (!ongoingQuery.data) {
              return;
            }
            qc.setQueryData(["entries", "current"], {
              ...ongoingQuery.data,
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
          date={
            ongoingQuery.data ? new Date(ongoingQuery.data.start) : new Date()
          }
          text="Stop"
          className="pb-1"
          disabled={!ongoingQuery.data || !ongoingQuery.data.stop}
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
