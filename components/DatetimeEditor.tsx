import { Dates } from "@/utils/dates";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Calendar,
  fromDateId,
  toDateId,
} from "@marceloterreiro/flash-calendar";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Modal,
  Text,
  TouchableNativeFeedback,
  View,
  TouchableWithoutFeedback,
} from "react-native";
import { Icon } from "./Icon";
import { set } from "@dotenvx/dotenvx";
import DatePickerModal from "./DatePickerModal";

const disabledColor = "#bbbbbb";

export default function DateTimeEditor(props: {
  text: string;
  date: Date;
  onDateChange?: (date: Date) => void;
  className?: string;
  disabled?: boolean;
  mustBeAfter?: Date;
  mustBeBefore?: Date;
}) {
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const year = props.date.getFullYear();
  const month = props.date.getMonth() + 1;
  const day = props.date.getDate();

  const hours = props.date.getHours();
  const displayHours = hours > 12 ? hours - 12 : hours;
  const minutes = props.date.getMinutes().toFixed().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  const mustBeBefore = props.mustBeBefore ?? new Date();

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
    if (newDate > mustBeBefore) {
      newDate.setHours(mustBeBefore.getHours());
      newDate.setMinutes(mustBeBefore.getMinutes());
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
    }
    if (newDate > mustBeBefore) return;
    props.onDateChange?.(newDate);
  };

  const changeMinutes = (minutes: number) => {
    const newDate = new Date(props.date);
    newDate.setMinutes(newDate.getMinutes() + minutes);
    if (newDate > mustBeBefore) return;
    if (props.mustBeAfter && newDate < props.mustBeAfter) return;
    props.onDateChange?.(newDate);
  };

  const [holdInterval, setHoldInterval] = useState<NodeJS.Timeout | null>(null);
  const changeTimeRef = useRef({
    changeMinutes,
    changeDay,
  });
  changeTimeRef.current = {
    changeMinutes,
    changeDay,
  };
  const onHold = (minutes: number, days: number) => {
    setHoldInterval(
      setInterval(() => {
        if (minutes !== 0) {
          changeTimeRef.current.changeMinutes(minutes);
        }
        if (days !== 0) {
          changeTimeRef.current.changeDay(days);
        }
      }, 500),
    );
  };
  const onHoldRelease = () => {
    if (holdInterval) clearInterval(holdInterval);
    setHoldInterval(null);
  };

  return (
    <View className={"flex w-full " + props.className}>
      <DatePickerModal
        date={props.date}
        title={`${props.text} Date`}
        maxDate={props.mustBeBefore}
        minDate={props.mustBeAfter}
        onClose={() => setDatePickerVisible(false)}
        visible={datePickerVisible}
        onDone={(date) => {
          const newDate = new Date(props.date);
          newDate.setFullYear(date.getFullYear());
          newDate.setMonth(date.getMonth());
          newDate.setDate(date.getDate());
          if (props.mustBeAfter && newDate < props.mustBeAfter) {
            newDate.setHours(props.mustBeAfter.getHours());
            newDate.setMinutes(props.mustBeAfter.getMinutes());
            newDate.setSeconds(0);
            newDate.setMilliseconds(0);
          }
          if (newDate > mustBeBefore) {
            newDate.setHours(mustBeBefore.getHours());
            newDate.setMinutes(mustBeBefore.getMinutes());
            newDate.setSeconds(0);
            newDate.setMilliseconds(0);
          }
          props.onDateChange?.(newDate);
          setDatePickerVisible(false);
        }}
        onClose={() => setDatePickerVisible(false)}
        visible={datePickerVisible}
      />
      <Text className="px-2 pb-1 text-2xl font-bold">{props.text}</Text>
      <View className="flex w-full gap-1 rounded-xl bg-gray-200 p-2">
        {/* Date */}
        <View className="flex flex-row justify-center gap-2">
          <View className="flex-grow overflow-hidden rounded-md">
            <TouchableNativeFeedback
              disabled={props.disabled}
              onPress={() => changeDay(-1)}
              onLongPress={() => onHold(0, -1)}
              onPressOut={onHoldRelease}
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
          <View className="overflow-hidden rounded-md">
            <TouchableNativeFeedback
              onPress={() => setDatePickerVisible(true)}
              disabled={props.disabled}
            >
              <View className="w-36 bg-white p-2">
                <Text
                  className="text-center text-xl font-semibold"
                  style={{ color: props.disabled ? disabledColor : "black" }}
                >
                  {props.disabled ? "---" : `${year}-${month}-${day}`}
                </Text>
              </View>
            </TouchableNativeFeedback>
          </View>
          <View className="flex-grow overflow-hidden rounded-md">
            <TouchableNativeFeedback
              disabled={props.disabled}
              onPress={() => changeDay(1)}
              onLongPress={() => onHold(0, 1)}
              onPressOut={onHoldRelease}
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
              onLongPress={() => onHold(-10, 0)}
              onPressOut={onHoldRelease}
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
              onLongPress={() => onHold(10, 0)}
              onPressOut={onHoldRelease}
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
