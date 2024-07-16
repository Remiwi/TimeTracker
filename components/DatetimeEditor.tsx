import { Dates } from "@/utils/dates";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, TouchableNativeFeedback, View } from "react-native";

const disabledColor = "#bbbbbb";

export default function DateTimeEditor(props: {
  text: string;
  date: Date;
  onDateChange?: (date: Date) => void;
  className?: string;
  disabled?: boolean;
  mustBeAfter?: Date;
}) {
  const year = props.date.getFullYear();
  const month = props.date.getMonth() + 1;
  const day = props.date.getDate();

  const hours = props.date.getHours();
  const displayHours = hours > 12 ? hours - 12 : hours;
  const minutes = props.date.getMinutes().toFixed().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  const changeDay = (days: number) => {
    const newDate = new Date(props.date);
    newDate.setDate(newDate.getDate() + days);
    if (props.mustBeAfter && newDate < props.mustBeAfter) {
      newDate.setHours(props.mustBeAfter.getHours());
      newDate.setMinutes(props.mustBeAfter.getMinutes());
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
    }
    if (props.mustBeAfter && newDate < props.mustBeAfter) return;
    if (newDate > new Date()) {
      newDate.setHours(new Date().getHours());
      newDate.setMinutes(new Date().getMinutes());
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
    }
    if (newDate > new Date()) return;
    props.onDateChange?.(newDate);
  };

  const changeMinutes = (minutes: number) => {
    const newDate = new Date(props.date);
    newDate.setMinutes(newDate.getMinutes() + minutes);
    if (newDate > new Date()) return;
    if (props.mustBeAfter && newDate < props.mustBeAfter) return;
    props.onDateChange?.(newDate);
  };

  return (
    <View className={"flex w-full " + props.className}>
      <Text className="px-2 pb-1 text-2xl font-bold">{props.text}</Text>
      <View className="flex w-full gap-1 rounded-xl bg-gray-200 p-2">
        {/* Date */}
        <View className="flex flex-row justify-center gap-2">
          <View className="flex-grow overflow-hidden rounded-md">
            <TouchableNativeFeedback
              disabled={props.disabled}
              onPress={() => changeDay(-1)}
            >
              <View className="flex flex-grow items-center justify-center p-1">
                <MaterialCommunityIcons
                  name="skip-backward"
                  size={24}
                  color={props.disabled ? disabledColor : "black"}
                />
              </View>
            </TouchableNativeFeedback>
          </View>
          <Text
            className="w-36 rounded-md bg-white p-2 text-center text-xl font-semibold"
            style={{ color: props.disabled ? disabledColor : "black" }}
          >
            {props.disabled ? "---" : `${year}-${month}-${day}`}
          </Text>
          <View className="flex-grow overflow-hidden rounded-md">
            <TouchableNativeFeedback
              disabled={props.disabled}
              onPress={() => changeDay(1)}
            >
              <View className="flex flex-grow items-center justify-center p-1">
                <MaterialCommunityIcons
                  name="skip-forward"
                  size={24}
                  color={props.disabled ? disabledColor : "black"}
                />
              </View>
            </TouchableNativeFeedback>
          </View>
        </View>
        {/* Time */}
        <View className="flex flex-row justify-center gap-2">
          <View className="flex-grow overflow-hidden rounded-md">
            <TouchableNativeFeedback
              disabled={props.disabled}
              onPress={() => changeMinutes(-1)}
            >
              <View className="flex flex-grow items-center justify-center p-1">
                <MaterialCommunityIcons
                  name="skip-backward"
                  size={24}
                  color={props.disabled ? disabledColor : "black"}
                />
              </View>
            </TouchableNativeFeedback>
          </View>
          <Text
            className="w-36 rounded-md bg-white p-2 text-center text-xl font-semibold"
            style={{ color: props.disabled ? disabledColor : "black" }}
          >
            {props.disabled ? "---" : `${displayHours}:${minutes} ${ampm}`}
          </Text>
          <View className="flex-grow overflow-hidden rounded-md">
            <TouchableNativeFeedback
              disabled={props.disabled}
              onPress={() => changeMinutes(1)}
            >
              <View className="flex flex-grow items-center justify-center p-1">
                <MaterialCommunityIcons
                  name="skip-forward"
                  size={24}
                  color={props.disabled ? disabledColor : "black"}
                />
              </View>
            </TouchableNativeFeedback>
          </View>
        </View>
      </View>
    </View>
  );
}
