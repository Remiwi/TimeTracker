import { useRef, useState } from "react";
import { Modal, Text, TouchableNativeFeedback, View } from "react-native";
import MyDropDown from "@/components/DropDown";
import MyTextInput from "@/components/TextInput";
import MyTagInput from "@/components/TagInput";
import { Project, Template } from "@/apis/types";
import { EntryEditorSheet } from "@/components/EntryEditorSheet";
import {
  useAddTemplateMutation,
  useDeleteTemplateMutation,
  useEditTemplateMutation,
} from "@/hooks/templateQueries";
import { useProjects } from "@/hooks/projectQueries";
import Templates from "@/components/index/Templates";
import ListModal from "@/components/ListModal";
import { Icon } from "@/components/Icon";

export default function Screen() {
  const [templatesEnabled, setTemplatesEnabled] = useState(true);
  const [templateModalShown, setTemplateModalShown] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<
    Template | undefined
  >();
  const [selectedPosition, setSelectedPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const createTemplateMutation = useAddTemplateMutation();
  const editTemplateMutation = useEditTemplateMutation();
  const deleteTemplateMutation = useDeleteTemplateMutation();

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
        <View className="z-50 h-56 w-full">
          <EntryEditorSheet
            onOpen={() => setTemplatesEnabled(false)}
            onClose={() => setTemplatesEnabled(true)}
          />
        </View>
        <Templates
          interactionsEnabled={templatesEnabled}
          onTemplateCreate={(pos) => {
            setSelectedTemplate(undefined);
            setSelectedPosition(pos);
            setTemplateModalShown(true);
          }}
          onTemplateEdit={(t) => {
            setSelectedTemplate(t);
            setTemplateModalShown(true);
          }}
        />
      </View>
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
  const [projModalVisible, setProjModalVisible] = useState(false);
  const projButtonLayout = useRef({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

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
          <Text className="pb-4 text-xl">Template Properties</Text>
          <MyTextInput
            label="Name"
            placeholder=""
            value={name}
            onChange={setName}
            className="pb-2"
          />
          <View className="flex flex-grow items-center justify-center pb-4 pt-6">
            <View className="h-0.5 w-full rounded-full bg-gray-300" />
          </View>
          <Text className="pb-4 text-lg">Entry Properties</Text>
          <MyTextInput
            label="Description"
            value={description}
            onChange={setDescription}
            className="pb-2"
          />
          <ListModal
            options={[null, ...(projectsQuery.data ?? [])]}
            visible={projModalVisible}
            backgroundColor="#f0f0f0"
            height={300}
            positionRelativeTo={projButtonLayout.current}
            renderOption={(option: Project | null) => {
              const proj = option ?? {
                id: null,
                name: "No Project",
                color: "#666",
                icon: "",
              };

              return (
                <View className="flex flex-row gap-4 border-b border-slate-300 px-4 py-2">
                  <View
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{
                      backgroundColor:
                        proj.id === null ? "#00000000" : proj.color,
                    }}
                  >
                    <Icon name={proj.icon as any} color={"white"} size={16} />
                  </View>
                  <Text className="text-xl" style={{ color: proj.color }}>
                    {proj.name}
                  </Text>
                </View>
              );
            }}
            onClose={() => setProjModalVisible(false)}
            onSelect={(selected: Project | null) => {
              setProjectID(selected?.id ?? null);
              setProjModalVisible(false);
            }}
          />
          <View
            className="overflow-hidden rounded-md pb-2"
            onLayout={(e) => {
              e.target.measure((x, y, width, height, pageX, pageY) => {
                projButtonLayout.current = {
                  x: pageX,
                  y: pageY + 50,
                  width,
                  height: 0,
                };
              });
            }}
          >
            <TouchableNativeFeedback onPress={() => setProjModalVisible(true)}>
              <View className="h-13 flex-row items-center justify-between gap-4 rounded-md border-2 border-gray-500 p-2">
                {project_id === null && (
                  <Text className="text-gray-400">Select Project</Text>
                )}
                {project_id !== null && (
                  <>
                    <View
                      className="aspect-square h-full items-center justify-center rounded-full"
                      style={{
                        backgroundColor: projectsQuery.data?.find(
                          (p) => p.id === project_id,
                        )?.color,
                      }}
                    >
                      <Icon
                        name={
                          projectsQuery.data?.find((p) => p.id === project_id)
                            ?.icon as any
                        }
                        color={"white"}
                        size={16}
                      />
                    </View>
                    <Text className="flex-grow text-gray-800">
                      {
                        projectsQuery.data?.find((p) => p.id === project_id)
                          ?.name
                      }
                    </Text>
                  </>
                )}
                <Icon
                  name="material/keyboard-arrow-down"
                  color="#444444"
                  size={24}
                />
              </View>
            </TouchableNativeFeedback>
          </View>
          <MyTagInput
            placeholder="Tags"
            value={tags}
            onChange={setTags}
            className="pb-4"
          />
          <View className="flex flex-grow flex-row justify-between pb-2">
            <View className="overflow-hidden rounded-full">
              <TouchableNativeFeedback onPress={props.onCancel}>
                <View className="flex w-28 items-center rounded-full p-2">
                  <Text className="font-bold text-gray-600">Cancel</Text>
                </View>
              </TouchableNativeFeedback>
            </View>
            <View className="overflow-hidden rounded-full">
              <TouchableNativeFeedback onPress={onDone}>
                <View className="flex w-28 items-center rounded-full p-2">
                  <Text className="font-bold text-gray-600">Done</Text>
                </View>
              </TouchableNativeFeedback>
            </View>
          </View>
          {props.defaultTemplate !== undefined && (
            <View className="flex items-center pb-0">
              <View className="w-44 overflow-hidden rounded-full">
                <TouchableNativeFeedback onPress={onDelete}>
                  <View className="flex w-full items-center rounded-full p-2">
                    <Text className="font-bold text-red-500">
                      Delete Template
                    </Text>
                  </View>
                </TouchableNativeFeedback>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
