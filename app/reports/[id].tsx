import { Group, Report } from "@/apis/types";
import { Icon } from "@/components/Icon";
import StyledTextInput from "@/components/TextInput";
import { DailyBreakdown } from "@/components/reports/DailyBreakdown";
import { useProjects } from "@/hooks/projectQueries";
import Colors from "@/utils/colors";
import { router, useLocalSearchParams } from "expo-router";
import { Text, TouchableNativeFeedback, View } from "react-native";

export default function ReportConfigScreen() {
  const local = useLocalSearchParams();

  const projects = useProjects();
  const blueProjects =
    projects.data === undefined
      ? []
      : projects.data.filter((p) => {
          return Colors.fromTogglHex(p.color)?.name === "blue";
        });

  const everything_group: Group = {
    id: 0,
    name: "Everything",
    icon: null,
    color: "red",
    isGlobal: true,
    project_ids: undefined,
  };
  const nothing_group: Group = {
    id: 1,
    name: "Nothing",
    icon: null,
    color: "black",
    isGlobal: true,
    project_ids: [],
  };
  const blue_group: Group = {
    id: 2,
    name: "Blue",
    icon: null,
    color: "blue",
    isGlobal: true,
    project_ids: blueProjects.map((p) => p.id),
  };

  const report: Report = {
    id: 0,
    name: "Daily project breakdown",
    groups: [everything_group, nothing_group, blue_group],
    type: "DailyBreakdown",
  };

  return (
    <View className="bg-gray-50 px-2 pt-4">
      <DailyBreakdown report={report} className="pb-6" />
      <StyledTextInput
        value={report.name}
        label="Name"
        className="pb-4"
        bgColor="#f9fafb"
      />
      <View className="w-full flex-row items-center justify-between px-4 pr-2">
        <Text className="text-2xl font-bold">Groups</Text>
        <View className="overflow-hidden rounded-full">
          <TouchableNativeFeedback>
            <View className="items-center justify-center p-2">
              <Icon name="material/add" />
            </View>
          </TouchableNativeFeedback>
        </View>
      </View>
      <View className="gap-2">
        {report.groups.map((group) => (
          <View
            className="overflow-hidden rounded-xl shadow-md shadow-black"
            key={group.id}
          >
            <TouchableNativeFeedback
              onPress={() => {
                router.push(`/groups/${group.id}`);
              }}
            >
              <View className="h-18 w-full flex-row items-center gap-4 bg-white pl-4 pr-1">
                <View className="items-center justify-center">
                  <View
                    className="h-12 w-12 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: group.color,
                    }}
                  >
                    <Icon name={group.icon as any} color="white" size={28} />
                  </View>
                </View>
                <Text className="flex-grow text-lg font-semibold">
                  {group.name}
                </Text>
                <View className="overflow-hidden rounded-full">
                  <TouchableNativeFeedback>
                    <View className="p-4">
                      <Icon name="material/close" color="gray" />
                    </View>
                  </TouchableNativeFeedback>
                </View>
              </View>
            </TouchableNativeFeedback>
          </View>
        ))}
      </View>
    </View>
  );
}
