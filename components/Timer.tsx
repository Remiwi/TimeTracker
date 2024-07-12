import { useEffect, useRef, useState } from "react";
import { Text, TouchableNativeFeedback, View } from "react-native";
import TimerText from "@/components/TimerText";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
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
import { useAddTemplate } from "@/hooks/templateHooks";
import { useProjects } from "@/hooks/projectHooks";
import {
  useBinnedEntry,
  useDeleteOngoing,
  useEditEntry,
  useFillStartToStop,
  useOngoingEntry,
  usePreviousEntry,
  useRestoreEntry,
  useStartEntry,
  useStopEntry,
  useSetStartToNow,
} from "@/hooks/entryHooks";

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

  // Queries
  const ongoing = useOngoingEntry();
  const previous = usePreviousEntry();
  const binned = useBinnedEntry();
  const projects = useProjects();

  // Mutations
  const startEntry = useStartEntry();
  const restoreEntry = useRestoreEntry();
  const editEntry = useEditEntry();
  const stopOngoing = useStopEntry();
  const fillStartToStop = useFillStartToStop();
  const addTemplate = useAddTemplate();
  const deleteOngoing = useDeleteOngoing();
  const setStartToNow = useSetStartToNow();

  const [displayEntry, setDisplayEntry] = useState<EntryWithProject | null>(
    null,
  );
  useEffect(() => {
    setDisplayEntry(ongoing.data || null);
  }, [ongoing.data]);

  const start = displayEntry ? new Date(displayEntry.start) : undefined;

  return (
    <View className="pt-4">
      {!displayEntry && (
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
              options={projects.data || []}
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
                startEntry.mutate({
                  description: "",
                  project_id: selected.id,
                  tags: [],
                });
                setProjectStartModalVisible(false);
              }}
            />
            <ChipBar>
              {/* Start from empty */}
              <ActionChip
                text="Start empty"
                leadingIcon="play-arrow"
                onPress={() => startEntry.mutate({})}
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
                onPress={() => restoreEntry.mutate()}
                hide={!binned.data}
              />
            </ChipBar>
          </View>
        </View>
      )}
      {displayEntry && (
        <>
          <View className="h-32">
            <View className="flex flex-row items-end justify-between px-4">
              <View>
                <View className="flex flex-row items-center gap-2">
                  <MaterialIcons
                    name="edit"
                    size={16}
                    color={displayEntry.description ? "black" : "#a8a29e"}
                    className="pb-2"
                  />
                  <StatefulTextInput
                    className="pb-2 text-2xl"
                    value={displayEntry.description || ""}
                    placeholder="Enter description..."
                    placeholderClassName="color-stone-400"
                    style={{ fontWeight: "bold" }}
                    placeholderStyle={{ fontWeight: "normal" }}
                    onChange={(t) => {
                      const text = t.trim();
                      editEntry.mutate({
                        id: displayEntry.id,
                        description: text || null,
                      });
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
                  backgroundColor: displayEntry.project_color || "#cccccc",
                }}
              >
                <MaterialCommunityIcons
                  name={displayEntry.project_icon as any}
                  color="white"
                  size={44}
                />
              </View>
            </View>
            {displayEntry?.tags.length > 0 && (
              <View className="flex flex-row items-center gap-2 px-4">
                <MaterialCommunityIcons name="tag" size={14} color="#a8a29e" />
                <Text className="font-light italic text-gray-400">
                  {displayEntry?.tags.join(", ") || ""}
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
              options={projects.data || []}
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
                editEntry.mutate({
                  id: displayEntry.id,
                  project_id: selected.id,
                });
                setProjectEditModalVisible(false);
              }}
            />
            {/* Tags */}
            <TagModal
              tags={displayEntry.tags}
              visible={tagModalVisible}
              backgroundColor="#f0f0f0"
              height={300}
              positionRelativeTo={chipBarLayout}
              onClose={() => {
                setTagModalVisible(false);
                editEntry.mutate({
                  id: displayEntry.id,
                  tags: displayEntry.tags,
                });
              }}
              onChange={(tags) => {
                setDisplayEntry({
                  ...displayEntry,
                  tags,
                });
              }}
            />
            <ChipBar>
              {/* Projects */}
              <ActionChip
                backgroundColor={displayEntry.project_color || "transparent"}
                borderColor={
                  displayEntry.project_id ? "transparent" : undefined
                }
                textColor={displayEntry.project_id ? "#eeeeee" : undefined}
                trailingIconColor={
                  displayEntry.project_id ? "#eeeeee" : undefined
                }
                text={displayEntry.project_name || "Project"}
                trailingIcon={displayEntry.project_id ? "close" : "add"}
                onPress={() => {
                  if (displayEntry.project_id) {
                    editEntry.mutate({
                      id: displayEntry.id,
                      project_id: null,
                    });
                  } else {
                    setProjectEditModalVisible(true);
                  }
                }}
              />
              {/* Tags */}
              <ActionChip
                text="Tags"
                backgroundColor={
                  displayEntry?.tags.length > 0 ? "#9e8e9e" : "transparent"
                }
                borderColor={
                  displayEntry?.tags.length > 0 ? "transparent" : undefined
                }
                textColor={
                  displayEntry?.tags.length > 0 ? "#eeeeee" : undefined
                }
                trailingIconColor={
                  displayEntry?.tags.length > 0 ? "#eeeeee" : undefined
                }
                trailingIcon={displayEntry?.tags.length > 0 ? "edit" : "add"}
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
                onPress={stopOngoing.mutate}
              />
              {/* Fill to last stop */}
              <ActionChip
                borderColor={fillStartToStop.isPending ? "#aaaaaa" : undefined}
                textColor={fillStartToStop.isPending ? "#aaaaaa" : undefined}
                leadingIconColor={
                  fillStartToStop.isPending ? "#aaaaaa" : undefined
                }
                text="Fill to last stop"
                leadingIcon="arrow-circle-left"
                onPress={fillStartToStop.mutate}
                hide={
                  !!previous.data &&
                  !!ongoing.data &&
                  previous.data?.stop === ongoing.data.start &&
                  !fillStartToStop.isPending
                }
              />
              {/* Set start to now */}
              <ActionChip
                borderColor={setStartToNow.isPending ? "#aaaaaa" : undefined}
                textColor={setStartToNow.isPending ? "#aaaaaa" : undefined}
                leadingIconColor={
                  setStartToNow.isPending ? "#aaaaaa" : undefined
                }
                text="Set start to now"
                leadingIcon="start"
                onPress={setStartToNow.mutate}
              />
              {/* Make Template */}
              <ActionChip
                borderColor={addTemplate.isPending ? "#aaaaaa" : undefined}
                textColor={addTemplate.isPending ? "#aaaaaa" : undefined}
                leadingIconColor={addTemplate.isPending ? "#aaaaaa" : undefined}
                text="Template"
                leadingIcon="add-circle"
                onPress={() => {
                  setTemplateMade(true);
                  addTemplate.mutate({
                    name: "",
                    project_id: displayEntry?.project_id || null,
                    description: displayEntry?.description || "",
                    tags: displayEntry?.tags || [],
                  });
                }}
                hide={templateMade && !addTemplate.isPending}
              />
              {/* Delete Entry */}
              <ActionChip
                borderColor="transparent"
                backgroundColor="#444444"
                textColor="#eeeeee"
                leadingIconColor="#eeeeee"
                text="Delete"
                leadingIcon="delete"
                onPress={deleteOngoing.mutate}
              />
            </ChipBar>
          </View>
        </>
      )}
      <View className="px-4 pt-4">
        <DateTimeEditor
          date={displayEntry ? new Date(displayEntry.start) : new Date()}
          onDateChange={(date) => {
            if (!displayEntry) {
              return;
            }
            setDisplayEntry({
              ...displayEntry,
              start: Dates.toISOExtended(date),
            });
          }}
          text="Start"
          className="pb-1"
        />
        <View className="flex w-full items-end">
          <View className="overflow-hidden rounded-sm">
            <TouchableNativeFeedback onPress={() => fillStartToStop.mutate()}>
              <View>
                <Text className="px-2 py-0.5 text-sm font-semibold text-slate-600">
                  Fill to last stop
                </Text>
              </View>
            </TouchableNativeFeedback>
          </View>
        </View>
        <DateTimeEditor
          date={displayEntry ? new Date(displayEntry.start) : new Date()}
          text="Stop"
          className="pb-1"
          disabled={!displayEntry || !displayEntry.stop}
        />
        <View className="flex w-full items-end">
          <View className="overflow-hidden rounded-sm">
            <TouchableNativeFeedback onPress={() => stopOngoing.mutate()}>
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
