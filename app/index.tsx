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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Data } from "@/apis/data";
import { Template } from "@/apis/types";
import { Dates } from "@/utils/dates";
import { useAtom } from "jotai";
import { templateMadeAtom } from "@/utils/atoms";
import TopSheet from "@/components/TopSheet";
import Timer from "@/components/Timer";

const VIBRATION_DURATION = 80;

export default function Page() {
  const qc = useQueryClient();

  const [templateModalShown, setTemplateModalShown] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<
    Template | undefined
  >();

  const [templatesEnabled, setTemplatesEnabled] = useState(true);

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
      <View className="relative flex h-full">
        <View className="z-50 h-56 w-full">
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
              setTemplatesEnabled(h === 200);
            }}
          >
            <Timer />
          </TopSheet>
        </View>
        <View className="h-full flex-shrink pt-6">
          {templatesQuery.isSuccess && (
            <FlatList
              scrollEnabled={templatesEnabled}
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
                        disabled={!templatesEnabled}
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
                      disabled={!templatesEnabled}
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
  disabled?: boolean;
}) {
  const qc = useQueryClient();
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: Data.Projects.getAll,
  });
  const thisProj = projectsQuery.data?.find(
    (p) => p.id === props.template.project_id,
  );

  const [_, setTemplateMade] = useAtom(templateMadeAtom);

  const startEntryMutation = useMutation({
    mutationFn: Data.Entries.start,
    onMutate: () => {
      setTemplateMade(true);
      const oldEntry = qc.getQueryData(["entries", "current"]);
      qc.setQueryData(["entries", "current"], {
        id: 0,
        description: props.template.description,
        project_id: props.template.project_id,
        start: Dates.toISOExtended(new Date()),
        stop: null,
        duration: -1,
        tags: props.template.tags,
        project_name: thisProj?.name || null,
        project_icon: thisProj?.icon || null,
        project_color: thisProj?.color || null,
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
          disabled={props.disabled}
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
