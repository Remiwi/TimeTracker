import { useState } from "react";
import {
  FlatList,
  Modal,
  Text,
  TouchableNativeFeedback,
  View,
  Vibration,
} from "react-native";
import MyDropDown from "@/components/DropDown";
import MyTextInput from "@/components/TextInput";
import MyTagInput from "@/components/TagInput";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import Toggl from "@/apis/toggl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { default as DB } from "@/apis/db";
import TimerText from "@/components/TimerText";
import { Temporal } from "@js-temporal/polyfill";
import { Data } from "@/apis/data";

const VIBRATION_DURATION = 80;

type TemplateStuff = {
  name: string;
  projectID: number;
  description: string;
  tags: string[];
};

export default function Page() {
  const qc = useQueryClient();

  const [templateModalShown, setTemplateModalShown] = useState(false);
  const [editTemplateIdx, setEditTemplateIdx] = useState<number>(-1);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: Data.Projects.getAll,
  });

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: DB.Templates.getAll,
  });
  const { mutate: mutateTemplates } = useMutation({
    mutationFn: DB.Templates.set,
    onError: (err, _, context) => {
      console.error(err);
      if (context) {
        qc.setQueryData(["templates"], context);
      }
    },
    onMutate: (newTemplates: TemplateStuff[]) => {
      const oldTemplates = templatesQuery.data as TemplateStuff[];
      qc.setQueryData(["templates"], newTemplates);
      return oldTemplates;
    },
  });
  if (templatesQuery.isLoading) {
    return <Text>Loading...</Text>;
  }
  if (templatesQuery.isError || !templatesQuery.data) {
    console.error(templatesQuery.error);
    return <Text>Error loading templates</Text>;
  }
  const templates = templatesQuery.data as TemplateStuff[];

  const small = true;
  return (
    <>
      {templateModalShown && (
        <TemplateEditModal
          onCancel={() => {
            setEditTemplateIdx(-1);
            setTemplateModalShown(false);
          }}
          onDone={(t) => {
            setEditTemplateIdx(-1);
            setTemplateModalShown(false);
            if (0 <= editTemplateIdx && editTemplateIdx < templates.length) {
              const newTemplates = [...templates];
              newTemplates[editTemplateIdx] = t;
              mutateTemplates(newTemplates);
              return;
            }
            mutateTemplates([...templates, t]);
          }}
          onDelete={() => {
            setEditTemplateIdx(-1);
            setTemplateModalShown(false);
            if (0 <= editTemplateIdx && editTemplateIdx < templates.length) {
              const newTemplates = [...templates];
              newTemplates.splice(editTemplateIdx, 1);
              mutateTemplates(newTemplates);
            }
          }}
          defaultTemplate={
            0 <= editTemplateIdx && editTemplateIdx < templates.length
              ? templates[editTemplateIdx]
              : undefined
          }
        />
      )}
      {!templateModalShown && <TimerControls />}
      <View className="flex h-full bg-gray-50 pt-4">
        <Timer />
        <View className="h-full flex-shrink rounded-t-3xl bg-gray-100 pt-6 shadow-xl shadow-black">
          <View className="flex w-full flex-row gap-2 p-2 pb-8">
            <Folder active={true} />
            <Folder />
            <Folder />
            <Folder />
          </View>
          <View className="flex items-center justify-center pb-6">
            <View className="h-0.5 w-2/3 rounded-full bg-gray-300" />
          </View>
          {small ? (
            <FlatList
              numColumns={3}
              key={3}
              data={
                [...templates, "add", "empty", "empty", "empty"] as (
                  | TemplateStuff
                  | "add"
                  | "empty"
                )[]
              }
              renderItem={(data) => {
                if (data.item === "add") {
                  return (
                    <View className="h-22 w-1/3 overflow-hidden rounded-lg bg-gray-50">
                      <TouchableNativeFeedback
                        onPress={() => setTemplateModalShown(true)}
                      >
                        <View className="flex h-full w-full justify-center rounded-lg border-2 border-dashed border-gray-200">
                          <Text className="text-center text-sm text-gray-400">
                            New Template
                          </Text>
                        </View>
                      </TouchableNativeFeedback>
                    </View>
                  );
                }
                if (data.item === "empty") {
                  return <View className="h-14 w-1/3" />;
                }

                return (
                  <View className="w-1/3">
                    <Item
                      isSmall={true}
                      templateStuff={data.item as TemplateStuff}
                      onLongPress={() => {
                        setEditTemplateIdx(data.index);
                        setTemplateModalShown(true);
                      }}
                    />
                  </View>
                );
              }}
              contentContainerClassName="gap-16"
              className="px-4"
            />
          ) : (
            <FlatList
              numColumns={2}
              key={2}
              data={
                [...templates, "add", "empty", "empty"] as (
                  | TemplateStuff
                  | "add"
                  | "empty"
                )[]
              }
              renderItem={(data) => {
                if (data.item === "add") {
                  return (
                    <View className="h-29 w-1/2 overflow-hidden rounded-lg bg-gray-50">
                      <TouchableNativeFeedback
                        onPress={() => setTemplateModalShown(true)}
                      >
                        <View className="flex h-full w-full justify-center rounded-lg border-2 border-dashed border-gray-200">
                          <Text className="text-center text-sm text-gray-400">
                            New Template
                          </Text>
                        </View>
                      </TouchableNativeFeedback>
                    </View>
                  );
                }
                if (data.item === "empty") {
                  return <View className="h-18 w-1/3" />;
                }

                return (
                  <View className="w-1/2">
                    <Item
                      isSmall={false}
                      templateStuff={data.item as TemplateStuff}
                      onLongPress={() => {
                        setEditTemplateIdx(data.index);
                        setTemplateModalShown(true);
                      }}
                    />
                  </View>
                );
              }}
              contentContainerClassName="gap-12"
              className="px-4"
            />
          )}
        </View>
      </View>
    </>
  );
}

function Item(props: {
  templateStuff: TemplateStuff;
  onLongPress?: () => void;
  isSmall: boolean;
}) {
  const qc = useQueryClient();
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: Data.Projects.getAll,
  });
  const thisProj = projectsQuery.data?.find(
    (p) => p.id === props.templateStuff.projectID,
  );

  const startEntryMutation = useMutation({
    mutationFn: Toggl.Entries.start,
    onMutate: () => {
      const oldEntry = qc.getQueryData(["currentEntry"]);
      qc.setQueryData(["currentEntry"], {
        id: 0,
        description: props.templateStuff.description,
        project_id: props.templateStuff.projectID,
        project_name: "props.templateStuff.project",
        project_color: "props.templateStuff.color",
        start: Temporal.Now.plainDateTimeISO("UTC").toString() + "Z",
        stop: null,
        duration: -1,
        tags: props.templateStuff.tags,
      });
      return oldEntry;
    },
    onError: (err) => {
      console.error(err);
      qc.setQueryData(["currentEntry"], null);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["currentEntry"],
      });
    },
  });

  if (props.isSmall) {
    return (
      <View className="flex h-22 px-1">
        <View className="h-14 w-14 rounded-full bg-white p-1 shadow-sm shadow-slate-900" />
        <View className="-top-14 z-50 h-14 w-14 rounded-full bg-white p-1">
          <View
            className={
              "flex h-full w-full items-center justify-center rounded-full"
            }
            style={{ backgroundColor: thisProj?.color || "#000000" }}
          >
            <MaterialCommunityIcons
              name={thisProj?.icon as any}
              size={24}
              color="white"
            />
          </View>
        </View>
        <View className="-top-21 h-14 w-full overflow-hidden rounded-lg bg-white shadow-sm shadow-slate-950">
          <TouchableNativeFeedback
            onLongPress={props.onLongPress}
            onPress={() => {
              startEntryMutation.mutate({
                description: props.templateStuff.description,
                projectID: props.templateStuff.projectID,
                tags: props.templateStuff.tags,
              });
              Vibration.vibrate(VIBRATION_DURATION);
            }}
          >
            <View className="flex p-2 pt-1">
              <Text className="self-end pb-1 text-sm">XX:XX:XX</Text>
              <Text className="text-sm">
                {props.templateStuff.name || props.templateStuff.description}
              </Text>
            </View>
          </TouchableNativeFeedback>
        </View>
      </View>
    );
  } else {
    return (
      <View className="flex h-29 px-1">
        <View className="h-18 w-18 rounded-full bg-white p-1 shadow-sm shadow-slate-900" />

        <View className="-top-18 z-50 h-18 w-18 rounded-full bg-white p-1">
          <View
            className={
              "flex h-full w-full items-center justify-center rounded-full"
            }
            style={{ backgroundColor: thisProj?.color || "#000000" }}
          >
            <MaterialCommunityIcons
              name={thisProj?.icon as any}
              size={32}
              color="white"
            />
          </View>
        </View>
        <View className="-top-29 h-20 w-full overflow-hidden rounded-lg bg-white shadow-sm shadow-slate-950">
          <TouchableNativeFeedback
            onLongPress={props.onLongPress}
            onPress={() => {
              startEntryMutation.mutate({
                description: props.templateStuff.description,
                projectID: props.templateStuff.projectID,
                tags: props.templateStuff.tags,
              });
            }}
          >
            <View className="flex p-2 pt-1">
              <Text className="text-md self-end pb-6">XX:XX:XX</Text>
              <Text>{props.templateStuff.name}</Text>
            </View>
          </TouchableNativeFeedback>
        </View>
      </View>
    );
  }
}

function Folder(props: { active?: boolean }) {
  const inactiveClassName = "bg-white shadow-sm";
  const activeClassName = "bg-gray-200 shadow-inner";

  return (
    <View
      className={
        "flex h-24 w-32 items-center justify-center rounded-2xl pt-1 shadow-black " +
        (props.active ? activeClassName : inactiveClassName)
      }
    >
      <View className="h-16 w-16 bg-black" />
      <Text>Folder name</Text>
    </View>
  );
}

function TemplateEditModal(props: {
  onCancel: () => void;
  onDone: (t: TemplateStuff) => void;
  onDelete: () => void;
  defaultTemplate?: TemplateStuff;
}) {
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: Data.Projects.getAll,
  });

  const [name, setName] = useState(props.defaultTemplate?.name || "");
  const [projectID, setProjectID] = useState(
    props.defaultTemplate?.projectID || -1,
  );
  const [description, setDescription] = useState(
    props.defaultTemplate?.description || "",
  );
  const [tags, setTags] = useState<string[]>(props.defaultTemplate?.tags || []);

  const onCancel = () => {
    setName("");
    setProjectID(-1);
    setDescription("");
    setTags([]);
    props.onCancel();
  };
  const onDone = () => {
    setName("");
    setProjectID(-1);
    setDescription("");
    setTags([]);

    props.onDone({
      name,
      projectID,
      description,
      tags,
    });
  };
  const onDelete = () => {
    setName("");
    setProjectID(-1);
    setDescription("");
    setTags([]);
    props.onDelete();
  };

  return (
    <Modal animationType="slide" transparent>
      <View
        className="flex h-full w-full items-center justify-center p-16"
        style={{ backgroundColor: "#00000088" }}
      >
        <View className="w-full rounded-2xl bg-gray-50 p-4">
          {props.defaultTemplate !== undefined && (
            <View className="flex items-center pb-2">
              <View className="w-44 overflow-hidden rounded-full shadow-sm shadow-slate-800">
                <TouchableNativeFeedback onPress={onDelete}>
                  <View className="flex w-full items-center rounded-full bg-slate-100 p-2">
                    <Text className="font-bold">Delete Template</Text>
                  </View>
                </TouchableNativeFeedback>
              </View>
            </View>
          )}
          <Text className="pb-4 text-xl">Template Properties</Text>
          <MyTextInput
            label="Name"
            placeholder=""
            value={name}
            onChange={(t) => setName(t)}
            className="pb-2"
          />
          <View className="flex flex-grow items-center justify-center pb-4 pt-8">
            <View className="h-0.5 w-full rounded-full bg-gray-300" />
          </View>
          <Text className="pb-4 text-lg">Entry Properties</Text>
          <MyTextInput
            label="Description"
            value={description}
            onChange={(t) => setDescription(t)}
            className="pb-2"
          />
          <MyDropDown
            placeholder="Select Project"
            options={projectsQuery.data || []}
            value={projectsQuery.data?.find((p) => p.id === projectID)}
            onChange={(item) => {
              setProjectID(item.id);
            }}
            itemToString={(item) => item.name}
            className="z-40 pb-2"
            placeholderColor={projectsQuery.isError ? "#884444" : undefined}
          />
          <MyTagInput
            placeholder="Tags"
            value={tags}
            onChange={(t) => setTags(t)}
            className="pb-4"
          />
          <View className="flex flex-grow flex-row justify-between">
            <View className="overflow-hidden rounded-full shadow-sm shadow-slate-800">
              <TouchableNativeFeedback onPress={onCancel}>
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

function TimerControls() {
  const qc = useQueryClient();

  const [showExtra, setShowExtra] = useState(false);

  const stopEntryMutation = useMutation({
    mutationFn: Toggl.Entries.stopCurrent,
    onMutate: () => {
      const oldEntry = qc.getQueryData(["currentEntry"]);
      qc.setQueryData(["currentEntry"], null);
      return oldEntry;
    },
    onError: (err, _, oldEntry) => {
      console.error(err);
      qc.setQueryData(["currentEntry"], oldEntry);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["currentEntry"],
      });
    },
  });
  const deleteEntryMutation = useMutation({
    mutationFn: Toggl.Entries.deleteCurrent,
    onMutate: () => {
      const oldEntry = qc.getQueryData(["currentEntry"]);
      qc.setQueryData(["currentEntry"], null);
      return oldEntry;
    },
    onError: (err, _, oldEntry) => {
      console.error(err);
      qc.setQueryData(["currentEntry"], oldEntry);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["currentEntry"],
      });
    },
  });
  const startToLastStopMutation = useMutation({
    mutationFn: Toggl.Entries.setCurrentStartToPrevStop,
    onMutate: () => {
      const oldEntry = qc.getQueryData(["currentEntry"]);
      qc.setQueryData(["currentEntry"], {
        ...(oldEntry as any),
      });
      return oldEntry;
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["currentEntry"],
      });
    },
  });

  return (
    <View className="absolute bottom-5 right-5 z-50 flex items-center gap-4">
      {showExtra && (
        <View className="relative left-4 flex flex-row gap-4">
          <View className="flex h-12 w-12 overflow-hidden rounded-full shadow-lg shadow-slate-950">
            <TouchableNativeFeedback
              onPress={() => {
                Vibration.vibrate(VIBRATION_DURATION);
                startToLastStopMutation.mutate();
              }}
            >
              <View className="h-full w-full items-center justify-center bg-gray-600">
                <MaterialCommunityIcons
                  name="clock-start"
                  color="white"
                  size={24}
                />
              </View>
            </TouchableNativeFeedback>
          </View>
          <View className="flex h-12 w-12 overflow-hidden rounded-full shadow-lg shadow-slate-950">
            <TouchableNativeFeedback>
              <View className="h-full w-full items-center justify-center bg-gray-600">
                <MaterialCommunityIcons
                  name="clock-end"
                  color="white"
                  size={24}
                />
              </View>
            </TouchableNativeFeedback>
          </View>
          <View className="flex h-12 w-12 overflow-hidden rounded-full shadow-lg shadow-slate-950">
            <TouchableNativeFeedback
              onPress={() => {
                Vibration.vibrate(VIBRATION_DURATION);
                deleteEntryMutation.mutate();
              }}
            >
              <View className="h-full w-full items-center justify-center bg-gray-600">
                <MaterialCommunityIcons
                  name="trash-can"
                  color="white"
                  size={24}
                />
              </View>
            </TouchableNativeFeedback>
          </View>
          <View className="flex h-12 w-12 overflow-hidden rounded-full shadow-lg shadow-slate-950">
            <TouchableNativeFeedback>
              <View className="h-full w-full items-center justify-center bg-gray-600">
                <MaterialIcons
                  name="restore-from-trash"
                  color="white"
                  size={24}
                />
              </View>
            </TouchableNativeFeedback>
          </View>
        </View>
      )}
      <View className="flex flex-row-reverse items-end justify-center gap-4">
        <View className="flex h-20 w-20 overflow-hidden rounded-full shadow-lg shadow-slate-950">
          <TouchableNativeFeedback
            onPress={() => {
              Vibration.vibrate(VIBRATION_DURATION);
              stopEntryMutation.mutate();
            }}
          >
            <View className="h-full w-full items-center justify-center bg-red-500">
              <MaterialIcons name="stop-circle" color="white" size={52} />
            </View>
          </TouchableNativeFeedback>
        </View>
        <View className="flex h-20 w-20 overflow-hidden rounded-full shadow-lg shadow-slate-950">
          <TouchableNativeFeedback
            onPress={() => {
              setShowExtra(!showExtra);
            }}
          >
            <View className="h-full w-full items-center justify-center bg-gray-600">
              <MaterialCommunityIcons
                name="clock-edit-outline"
                color="white"
                size={48}
              />
            </View>
          </TouchableNativeFeedback>
        </View>
        <View className="flex h-12 w-12 overflow-hidden rounded-full shadow-lg shadow-slate-950">
          <TouchableNativeFeedback>
            <View className="h-full w-full items-center justify-center bg-gray-600">
              <MaterialCommunityIcons name="redo" color="white" size={24} />
            </View>
          </TouchableNativeFeedback>
        </View>
        <View className="flex h-12 w-12 overflow-hidden rounded-full shadow-lg shadow-slate-950">
          <TouchableNativeFeedback>
            <View className="h-full w-full items-center justify-center bg-gray-600">
              <MaterialCommunityIcons name="undo" color="white" size={24} />
            </View>
          </TouchableNativeFeedback>
        </View>
      </View>
    </View>
  );
}

function Timer() {
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: Data.Projects.getAll,
  });

  const timeEntryQuery = useQuery({
    queryKey: ["currentEntry"],
    queryFn: Toggl.Entries.getCurrent,
  });

  const start = timeEntryQuery.data
    ? Temporal.Instant.from(timeEntryQuery.data.start)
    : undefined;

  const projectID = timeEntryQuery.data?.project_id || -1;
  const project = projectsQuery.data?.find((v) => {
    return v.id === projectID;
  });
  const projectName = project ? project.name : "No Project";
  const projectHex = project ? project.color : "#cccccc";
  const projectIcon = project ? project.icon : "";

  return (
    <View className="pb-6">
      <View className="flex flex-row items-end justify-between px-4 pb-1">
        <View>
          <Text className="pb-2 text-xl font-bold">
            {timeEntryQuery.data ? projectName : "..."}
          </Text>
          <TimerText className="text-6xl" startTime={start} />
        </View>
        <View
          className={
            "flex aspect-square w-24 items-center justify-center rounded-full shadow-md shadow-black"
          }
          style={{ backgroundColor: projectHex }}
        >
          <MaterialCommunityIcons
            name={projectIcon as any}
            color="white"
            size={44}
          />
        </View>
      </View>
      <View className="px-4">
        <Text className="font-light">
          {timeEntryQuery.data?.description || "..."}
        </Text>
        <Text className="font-light italic text-gray-400">
          {timeEntryQuery.data?.tags || "..."}
        </Text>
      </View>
    </View>
  );
}
