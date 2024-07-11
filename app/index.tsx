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
import TimerText from "@/components/TimerText";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Data } from "@/apis/data";
import { Project, Template } from "@/apis/types";
import { Dates } from "@/utils/dates";
import ChipBar from "@/components/ChipBar";
import ActionChip from "@/components/ActionChip";
import OptionChip from "@/components/OptionChip";

const VIBRATION_DURATION = 80;

export default function Page() {
  const qc = useQueryClient();

  const [templateModalShown, setTemplateModalShown] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<
    Template | undefined
  >();

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: Data.Templates.getAll,
  });

  const createTemplateMutation = useMutation({
    mutationFn: Data.Templates.create,
    onError: (err) => {
      console.error(err);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
  const editTemplateMutation = useMutation({
    mutationFn: Data.Templates.edit,
    onError: (err) => {
      console.error(err);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
  const deleteTemplateMutation = useMutation({
    mutationFn: Data.Templates.delete,
    onError: (err) => {
      console.error(err);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  const templates = templatesQuery.data || [];

  const small = true;
  return (
    <View className="bg-gray-100">
      {templateModalShown && (
        <TemplateEditModal
          defaultTemplate={selectedTemplate}
          onCancel={() => {
            setTemplateModalShown(false);
          }}
          onCreate={(template) => {
            createTemplateMutation.mutate(template);
            setTemplateModalShown(false);
          }}
          onEdit={(template) => {
            editTemplateMutation.mutate(template);
            setTemplateModalShown(false);
          }}
          onDelete={(id) => {
            deleteTemplateMutation.mutate(id);
            setTemplateModalShown(false);
          }}
        />
      )}
      <View className="flex h-full">
        <Timer />
        <View className="h-full flex-shrink pt-6">
          {templatesQuery.isSuccess && (
            <FlatList
              numColumns={small ? 3 : 2}
              key={small ? 3 : 2}
              data={
                [
                  ...templates,
                  "add",
                  "empty",
                  "empty",
                  small ? "empty" : undefined,
                ] as (Template | "add" | "empty" | undefined)[]
              }
              renderItem={(data) => {
                if (data.item === undefined) {
                  return <View></View>;
                }
                if (data.item === "add") {
                  return (
                    <View
                      className={
                        "overflow-hidden rounded-lg bg-gray-50 " +
                        (small ? "h-22 w-1/3" : "h-29 w-1/2")
                      }
                    >
                      <TouchableNativeFeedback
                        onPress={() => {
                          setSelectedTemplate(undefined);
                          setTemplateModalShown(true);
                        }}
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
                  return (
                    <View className={small ? "h-14 w-1/3" : "h-18 w-1/2"} />
                  );
                }
                return (
                  <View className={small ? "w-1/3" : "w-1/2"}>
                    <Item
                      isSmall={true}
                      template={data.item as Template}
                      onLongPress={() => {
                        setSelectedTemplate(data.item as Template);
                        setTemplateModalShown(true);
                      }}
                    />
                  </View>
                );
              }}
              contentContainerClassName={small ? "gap-16" : "gap-12"}
              className="px-4"
            />
          )}
        </View>
      </View>
    </View>
  );
}

function Item(props: {
  template: Template;
  onLongPress?: () => void;
  isSmall: boolean;
}) {
  const qc = useQueryClient();
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: Data.Projects.getAll,
  });
  const thisProj = projectsQuery.data?.find(
    (p) => p.id === props.template.project_id,
  );

  const startEntryMutation = useMutation({
    mutationFn: Data.Entries.start,
    onMutate: () => {
      const oldEntry = qc.getQueryData(["entries", "current"]);
      qc.setQueryData(["entries", "current"], {
        id: 0,
        description: props.template.description,
        project_id: props.template.project_id,
        start: Dates.toISOExtended(new Date()),
        stop: null,
        duration: -1,
        tags: props.template.tags,
      });
      return oldEntry;
    },
    onError: (err) => {
      console.error(err);
      qc.setQueryData(["entries", "current"], null);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["entries"],
      });
    },
  });

  return (
    <View className={"flex px-1 " + (props.isSmall ? "h-22" : "h:29")}>
      <View
        className={
          "rounded-full bg-white p-1 shadow-sm shadow-slate-900 " +
          (props.isSmall ? "h-14 w-14" : "h-18 w-18")
        }
      />
      <View
        className={
          "z-50 rounded-full bg-white p-1 " +
          (props.isSmall ? "-top-14 h-14 w-14" : "-top-18 h-18 w-18")
        }
      >
        <View
          className={
            "flex h-full w-full items-center justify-center rounded-full"
          }
          style={{ backgroundColor: thisProj?.color || "#cccccc" }}
        >
          <MaterialCommunityIcons
            name={(thisProj?.icon as any) || "map-marker-question"}
            size={props.isSmall ? 24 : 32}
            color="white"
          />
        </View>
      </View>
      <View
        className={
          "w-full overflow-hidden rounded-lg bg-white shadow-sm shadow-slate-950 " +
          (props.isSmall ? "-top-21 h-14" : "-top-29 h-20")
        }
      >
        <TouchableNativeFeedback
          onLongPress={props.onLongPress}
          onPress={() => {
            startEntryMutation.mutate({
              description: props.template.description,
              project_id: props.template.project_id,
              tags: props.template.tags,
            });
            Vibration.vibrate(VIBRATION_DURATION);
          }}
        >
          <View className="flex p-2 pt-1">
            <Text
              className={
                "self-end " + (props.isSmall ? "pb-1 text-sm" : "text-md pb-6")
              }
            >
              XX:XX:XX
            </Text>
            <Text className={props.isSmall ? "text-sm" : ""}>
              {props.template.name ||
                props.template.description ||
                thisProj?.name}
            </Text>
          </View>
        </TouchableNativeFeedback>
      </View>
    </View>
  );
}

function TemplateEditModal(props: {
  onCancel: () => void;
  onCreate: (t: Template) => void;
  onEdit: (t: Template) => void;
  onDelete: (id: number) => void;
  defaultTemplate?: Template;
}) {
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: Data.Projects.getAll,
  });

  const [name, setName] = useState(props.defaultTemplate?.name || "");
  const [project_id, setProjectID] = useState(
    props.defaultTemplate?.project_id || null,
  );
  const [description, setDescription] = useState(
    props.defaultTemplate?.description || "",
  );
  const [tags, setTags] = useState<string[]>(props.defaultTemplate?.tags || []);

  const onDone = () => {
    if (props.defaultTemplate === undefined) {
      props.onCreate({
        id: 0, // Id should be ignored for creation anyways
        name,
        project_id,
        description,
        tags,
      });
    } else {
      props.onEdit({
        ...props.defaultTemplate,
        name,
        project_id,
        description,
        tags,
      });
    }
  };

  const onDelete = () => {
    if (props.defaultTemplate !== undefined) {
      props.onDelete(props.defaultTemplate.id);
    }
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
            onChange={setName}
            className="pb-2"
          />
          <View className="flex flex-grow items-center justify-center pb-4 pt-8">
            <View className="h-0.5 w-full rounded-full bg-gray-300" />
          </View>
          <Text className="pb-4 text-lg">Entry Properties</Text>
          <MyTextInput
            label="Description"
            value={description}
            onChange={setDescription}
            className="pb-2"
          />
          <MyDropDown
            placeholder="Select Project"
            options={projectsQuery.data || []}
            value={projectsQuery.data?.find((p) => p.id === project_id)}
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
            onChange={setTags}
            className="pb-4"
          />
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

function Timer() {
  const qc = useQueryClient();

  const ongoingQuery = useQuery({
    queryKey: ["entries", "current"],
    queryFn: Data.Entries.getCurrentWithProject,
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: Data.Projects.getAll,
  });

  const editOngoingProjectMutation = useMutation({
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
      ongoingQuery.refetch();
    },
  });

  const start = ongoingQuery.data
    ? new Date(ongoingQuery.data.start)
    : undefined;

  return (
    <View className="rounded-b-3xl bg-white pt-4 shadow-md shadow-black">
      {!ongoingQuery.data && (
        <View className="flex items-center justify-between">
          <View className="flex h-36 flex-grow items-center justify-center">
            <Text className="px-8 text-4xl color-gray-400">
              No running entry
            </Text>
          </View>
          <ChipBar>
            <ActionChip
              text="Action"
              leadingIcon="check"
              trailingIcon="close"
            />
            <ActionChip
              text="Action"
              leadingIcon="check"
              trailingIcon="close"
            />
            <ActionChip
              text="Action"
              leadingIcon="check"
              trailingIcon="close"
            />
            <ActionChip
              text="Action"
              leadingIcon="check"
              trailingIcon="close"
            />
            <ActionChip
              text="Action"
              leadingIcon="check"
              trailingIcon="close"
            />
            <ActionChip
              text="Action"
              leadingIcon="check"
              trailingIcon="close"
            />
          </ChipBar>
        </View>
      )}
      {ongoingQuery.data && (
        <>
          <View className="flex flex-row items-end justify-between px-4">
            <View>
              <Text className="pb-2 text-2xl font-semibold">
                {ongoingQuery.data.description || "..."}
              </Text>
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
          <Text className="px-4 font-light italic text-gray-400">
            {ongoingQuery.data?.tags || "..."}
          </Text>
          <ChipBar>
            <ActionChip
              backgroundColor={ongoingQuery.data.project_color || "transparent"}
              textColor={ongoingQuery.data.project_id ? "#eeeeee" : undefined}
              leadingIconColor={
                ongoingQuery.data.project_id ? "#eeeeee" : undefined
              }
              trailingIconColor={
                ongoingQuery.data.project_id ? "#eeeeee" : undefined
              }
              text={ongoingQuery.data.project_name || "Project"}
              trailingIcon={ongoingQuery.data.project_id ? "close" : "add"}
              onPress={() => editOngoingProjectMutation.mutate(null)}
            />
            <OptionChip
              text="Project"
              options={projectsQuery.data || []}
              optionsBackgroundColor="#e7e5e4"
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
              onChange={(option) => editOngoingProjectMutation.mutate(option)}
            />
            <ActionChip
              text="Action"
              leadingIcon="check"
              trailingIcon="close"
            />
            <ActionChip
              text="Action"
              leadingIcon="check"
              trailingIcon="close"
            />
            <ActionChip
              text="Action"
              leadingIcon="check"
              trailingIcon="close"
            />
            <ActionChip
              text="Action"
              leadingIcon="check"
              trailingIcon="close"
            />
            <ActionChip
              text="Action"
              leadingIcon="check"
              trailingIcon="close"
            />
          </ChipBar>
          <View className="flex w-full items-center justify-center pb-3">
            <View className="h-1 w-32 rounded-full bg-gray-300" />
          </View>
        </>
      )}
    </View>
  );
}
