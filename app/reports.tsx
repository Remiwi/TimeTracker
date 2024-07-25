import { Entry, EntryWithProject } from "@/apis/types";
import { useEntries } from "@/hooks/entryQueries";
import { Dates } from "@/utils/dates";
import { MaterialIcons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import { Text, TouchableNativeFeedback, View } from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";

export default function Reports() {
  const [weeksAgo, setWeeksAgo] = useState(2);

  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - dayOfWeek - weeksAgo * 7,
  );
  const weekEnd = new Date(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate() + 7,
  );
  const dayBeforeWeekEnd = new Date(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate() + 6,
  );

  const weekName =
    weeksAgo === 0
      ? "This Week"
      : weeksAgo === 1
        ? "Last Week"
        : `${Dates.toISOExtended(weekStart).split("T")[0]}   -   ${Dates.toISOExtended(dayBeforeWeekEnd).split("T")[0]}`;

  const entriesQ = useEntries();

  const weekEntries = useMemo(() => {
    if (!entriesQ.data) {
      return [];
    }

    const filtered = entriesQ.data?.filter((entry) => {
      return (
        entry.start >= Dates.toISOExtended(weekStart) &&
        entry.start <= Dates.toISOExtended(weekEnd)
      );
    });

    return filtered.map((entry) => {
      if (entry.stop !== null) return entry;
      return {
        ...entry,
        stop: null,
        duration: new Date().getTime() - new Date(entry.start).getTime(),
      };
    });
  }, [entriesQ.data, weekStart, weekEnd]);

  return (
    <View className="flex gap-4 p-2">
      <View className="flex-row items-center justify-between px-4">
        <View className="overflow-hidden rounded-full">
          <TouchableNativeFeedback
            onPress={() => {
              setWeeksAgo(weeksAgo + 1);
            }}
          >
            <View className="items-center justify-center p-1">
              <MaterialIcons name="chevron-left" size={24} />
            </View>
          </TouchableNativeFeedback>
        </View>
        <Text className="text-xl">{weekName}</Text>
        <View className="overflow-hidden rounded-full">
          <TouchableNativeFeedback
            onPress={() => {
              if (weeksAgo === 0) return;
              setWeeksAgo(weeksAgo - 1);
            }}
          >
            <View className="items-center justify-center p-1">
              <MaterialIcons name="chevron-right" size={24} />
            </View>
          </TouchableNativeFeedback>
        </View>
      </View>
      <HoursPerDay entries={weekEntries} />
      <HoursPerProject entries={weekEntries} />
    </View>
  );
}

function HoursPerDay(props: { entries: Entry[] }) {
  const [invertToRerender, rerender] = useState(false);
  const chartDims = useRef({ width: 0, height: 0 });

  const hoursPerDay = useMemo(() => {
    const hours = [0, 0, 0, 0, 0, 0, 0];
    for (const entry of props.entries) {
      hours[new Date(entry.start).getDay()] += entry.duration;
    }
    return hours.map((h) => h / 60 / 60);
  }, [props.entries]);

  const largest = Math.max(...hoursPerDay);

  const data = {
    labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    datasets: [
      {
        data: hoursPerDay.map((h) => Math.min(h, 24)),
      },
    ],
  };

  const primaryColor = (opacity = 1) => `rgba(80, 80, 80, ${opacity})`;

  return (
    <View className="h-80 w-full gap-4 rounded-2xl bg-gray-50 p-4 pb-2 shadow-md shadow-black">
      <Text
        className="text-center text-xl font-bold"
        style={{
          color: primaryColor(),
        }}
      >
        Hours Tracked
      </Text>
      {props.entries.length !== 0 && (
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
          <BarChart
            data={data}
            width={chartDims.current.width}
            height={chartDims.current.height}
            yAxisLabel=""
            yAxisSuffix="h"
            segments={3}
            fromZero={true}
            chartConfig={{
              color: primaryColor,
              backgroundGradientFrom: "#000000",
              backgroundGradientTo: "#000000",
              backgroundGradientFromOpacity: 0,
              backgroundGradientToOpacity: 0,
              decimalPlaces: largest < 1 ? 1 : 0,
            }}
          />
        </View>
      )}
      {props.entries.length === 0 && (
        <View className="flex-grow items-center justify-center">
          <Text
            className="text-3xl font-bold"
            style={{
              color: primaryColor(0.5),
            }}
          >
            No entries this week
          </Text>
        </View>
      )}
    </View>
  );
}

function HoursPerProject(props: { entries: EntryWithProject[] }) {
  const [invertToRerender, rerender] = useState(false);
  const chartDims = useRef({ width: 0, height: 0 });

  const primaryColor = (opacity = 1) => `rgba(80, 80, 80, ${opacity})`;

  const hoursPerProject = useMemo(() => {
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

    for (const entry of props.entries) {
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
  }, [props.entries]);

  const data = [...hoursPerProject.keys()].map((k) => ({
    ...hoursPerProject.get(k)!,
    duration:
      Math.round((hoursPerProject.get(k)!.duration / 60 / 60) * 10) / 10,
  }));

  return (
    <View className="h-80 w-full gap-4 rounded-2xl bg-gray-50 p-4 pb-2 shadow-md shadow-black">
      <Text className="text-center text-xl font-bold">Hours By Project</Text>
      {props.entries.length !== 0 && (
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
      {props.entries.length === 0 && (
        <View className="flex-grow items-center justify-center">
          <Text
            className="text-3xl font-bold"
            style={{
              color: primaryColor(0.5),
            }}
          >
            No entries this week
          </Text>
        </View>
      )}
    </View>
  );
}
