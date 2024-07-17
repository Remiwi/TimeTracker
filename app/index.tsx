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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Data } from "@/apis/data";
import { Template, TemplateWithProject } from "@/apis/types";
import { Dates } from "@/utils/dates";
import { useAtom } from "jotai";
import { templateMadeAtom } from "@/utils/atoms";
import TopSheet from "@/components/TopSheet";
import Timer from "@/components/Timer";
import {
  useAddTemplateMutation,
  useDeepest,
  useDeleteTemplateMutation,
  useEditTemplateMutation,
  useTemplates,
} from "@/hooks/templateQueries";
import { useProjects } from "@/hooks/projectQueries";
import { useStartTemplateMutation } from "@/hooks/entryQueries";
import { TouchableWithoutFeedback } from "react-native-gesture-handler";

const VIBRATION_DURATION = 80;

export default function Page() {
  const [templatesEnabled, setTemplatesEnabled] = useState(true);
  const [templateModalShown, setTemplateModalShown] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<
    Template | undefined
  >();
  const [selectedPosition, setSelectedPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  const templatesQuery = useTemplates();
  const deepestPos = useDeepest();

  const createTemplateMutation = useAddTemplateMutation();
  const editTemplateMutation = useEditTemplateMutation();
  const deleteTemplateMutation = useDeleteTemplateMutation();

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
            createTemplateMutation.mutate({
              template: {
                ...template,
                posx: selectedPosition.x,
                posy: selectedPosition.y,
              },
              num_cols: small ? 3 : 2,
            });
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
        <View className="z-50 h-48 w-full">
          <Timer
            onOpen={() => setTemplatesEnabled(false)}
            onClose={() => setTemplatesEnabled(true)}
          />
        </View>
        <View className="h-full flex-shrink pt-6">
          {templatesQuery.isSuccess && (
            <FlatList
              numColumns={small ? 3 : 2}
              key={small ? 3 : 2}
              scrollEnabled={templatesEnabled}
              data={Array(
                (deepestPos.data && deepestPos.data.posy > 1
                  ? deepestPos.data.posy + 1
                  : 4) *
                  3 +
                  3,
              )}
              extraData={templates}
              contentContainerClassName="p-4 pb-0"
              renderItem={(data) => {
                const itemsPerRow = small ? 3 : 2;
                const posx = data.index % itemsPerRow;
                const posy = Math.floor(data.index / itemsPerRow);
                const template = templates.find(
                  (t) => t.posx === posx && t.posy === posy,
                );

                return (
                  <View
                    className="h-36"
                    style={{ width: small ? "33.3333%" : "50%" }}
                  >
                    {template && (
                      <Item
                        disabled={!templatesEnabled}
                        isSmall={true}
                        template={template}
                        onLongPress={() => {
                          setSelectedTemplate(template as Template);
                          setTemplateModalShown(true);
                        }}
                      />
                    )}
                    {!template && (
                      <TouchableWithoutFeedback
                        onLongPress={() => {
                          setSelectedTemplate(undefined);
                          setSelectedPosition({ x: posx, y: posy });
                          setTemplateModalShown(true);
                        }}
                      >
                        <View className="h-full items-center justify-center" />
                      </TouchableWithoutFeedback>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </View>
  );
}

function Item(props: {
  template: TemplateWithProject;
  onLongPress?: () => void;
  isSmall: boolean;
  disabled?: boolean;
}) {
  const displayName =
    props.template.name ||
    props.template.description ||
    props.template.project_name ||
    "Unnamed";

  const startEntryMutation = useStartTemplateMutation();

  return (
    <View className="overflow-hidden rounded-lg">
      <TouchableNativeFeedback
        onPress={() => {
          startEntryMutation.mutate(props.template);
        }}
        onLongPress={props.onLongPress}
        disabled={props.disabled}
      >
        <View className="items-center justify-center pb-1 pt-2">
          <View className="flex-row justify-center gap-1">
            <View className="w-4" />
            <View
              className="aspect-square w-5/12 items-center justify-center rounded-full"
              style={{
                backgroundColor: props.template?.project_color || "#cccccc",
              }}
            >
              <MaterialCommunityIcons
                name={(props.template.project_icon as any) || undefined}
                size={props.isSmall ? 26 : 32}
                color="white"
              />
            </View>
            <View className="w-4 gap-1">
              {props.template.tags.length > 0 && (
                <MaterialCommunityIcons name="tag" size={12} color="#bbbbbb" />
              )}
            </View>
          </View>
          <Text className="pt-1">{displayName}</Text>
        </View>
      </TouchableNativeFeedback>
    </View>
  );
}

function TemplateEditModal(props: {
  onCancel: () => void;
  onCreate: (t: Omit<Template, "id">) => void;
  onEdit: (t: Partial<Template> & { id: number }) => void;
  onDelete: (id: number) => void;
  defaultTemplate?: Template;
}) {
  const projectsQuery = useProjects();

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
        name,
        project_id,
        description,
        tags,
        page: 0,
        posx: 0,
        posy: 0,
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
