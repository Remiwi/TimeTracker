import { EntryWithProject, Report } from "@/apis/types";
import { useEntries } from "@/hooks/entryQueries";
import { useMemo, useRef, useState } from "react";
import { Text, TouchableNativeFeedback, View } from "react-native";
import { PieChart } from "react-native-chart-kit";

export function DailyBreakdown(props: { report: Report }) {
  const allEntries = useEntries();
  const today = new Date();

  const dayEntries = useMemo(() => {
    if (!allEntries.data) {
      return [];
    }

    const filtered = allEntries.data?.filter((entry) => {
      const entryStart = new Date(entry.start);
      return (
        entryStart.getFullYear() === today.getFullYear() &&
        entryStart.getMonth() === today.getMonth() &&
        entryStart.getDate() === today.getDate()
      );
    });

    return filtered;
  }, [allEntries.data, today.getFullYear(), today.getMonth(), today.getDate()]);

  const filteredEntries = useMemo(() => {
    if (props.report.groups === undefined) {
      return [];
    }

    const filtered = dayEntries.filter((entry) => {
      for (const group of props.report.groups) {
        if (group.project_ids === undefined) {
          return true;
        }
        if (group.project_ids.includes(entry.project_id)) {
          return true;
        }
      }
      return false;
    });

    return filtered;
  }, [props.report]);

  const [invertToRerender, rerender] = useState(false);
  const chartDims = useRef({ width: 0, height: 0 });

  const primaryColor = (opacity = 1) => `rgba(80, 80, 80, ${opacity})`;

  const entryBreakdown = useMemo(() => {
    const hours = new Map<
      number | null,
      {
        name: string;
        duration: number;
        color: string;
        legendFontColor: string;
        legendFontSize: number;
      }
    >();

    for (const entry of filteredEntries) {
      const key = entry.project_id;
      if (!hours.has(key)) {
        hours.set(key, {
          name: entry.project_name ?? "No Project",
          duration: 0,
          color: entry.project_color ?? "#cccccc",
          legendFontColor: primaryColor(),
          legendFontSize: 12,
        });
      }
      hours.get(key)!.duration += entry.duration;
    }
    return hours;
  }, [filteredEntries]);

  const data = [...entryBreakdown.keys()].map((k) => ({
    ...entryBreakdown.get(k)!,
    duration: Math.round((entryBreakdown.get(k)!.duration / 60 / 60) * 10) / 10,
  }));

  return (
    <View className="overflow-hidden rounded-2xl shadow-md shadow-black">
      <TouchableNativeFeedback>
        <View className="h-80 w-full gap-4 bg-gray-50 p-4 pb-2">
          <Text className="text-center text-xl font-bold">
            {props.report.name}
          </Text>
          {filteredEntries.length !== 0 && (
            <View
              className="h-full w-full flex-shrink"
              onLayout={(e) => {
                if (
                  chartDims.current.width === e.nativeEvent.layout.width &&
                  chartDims.current.height === e.nativeEvent.layout.height
                ) {
                  return;
                }
                chartDims.current.width = e.nativeEvent.layout.width;
                chartDims.current.height = e.nativeEvent.layout.height;
                rerender(!invertToRerender);
              }}
            >
              <PieChart
                data={data}
                accessor="duration"
                backgroundColor="transparent"
                paddingLeft="32"
                center={[0, 0]}
                width={chartDims.current.width}
                height={chartDims.current.height}
                fromZero={true}
                absolute
                chartConfig={{
                  color: primaryColor,
                  backgroundGradientFrom: "#000000",
                  backgroundGradientTo: "#000000",
                  backgroundGradientFromOpacity: 0,
                  backgroundGradientToOpacity: 0,
                  decimalPlaces: 1,
                }}
              />
            </View>
          )}
          {filteredEntries.length === 0 && (
            <View className="flex-grow items-center justify-center">
              <Text
                className="text-3xl font-bold"
                style={{
                  color: primaryColor(0.5),
                }}
              >
                No entries today
              </Text>
              <Text
                className="text-lg font-bold"
                style={{
                  color: primaryColor(0.5),
                }}
              >
                Change filters?
              </Text>
            </View>
          )}
        </View>
      </TouchableNativeFeedback>
    </View>
  );
}
