import { set } from "@dotenvx/dotenvx";
import { useEffect, useState } from "react";
import {
  Modal,
  Text,
  TouchableNativeFeedback,
  View,
  TouchableWithoutFeedback,
} from "react-native";
import { TextInput } from "react-native-gesture-handler";

export default function TimePickerModal(props: {
  title: string;
  visible: boolean;
  time: Date;
  onClose: () => void;
  onDone: (time: Date) => void;
  limitHoursTo24?: boolean;
  useAMPM?: boolean;
}) {
  const limitHoursTo24 = props.limitHoursTo24 ?? false;
  const useAMPM = props.useAMPM ?? false;
  if (!limitHoursTo24 && useAMPM) {
    throw new Error("Cannot use AM/PM if hours are not limited to 24");
  }

  const [prevTime, setPrevTime] = useState({
    hours: props.time.getHours(),
    minutes: props.time.getMinutes(),
  });
  const [time, setTime] = useState({
    hours: props.time.getHours() as number | null,
    minutes: props.time.getMinutes() as number | null,
  });
  const [hoursFocused, setHoursFocused] = useState(false);
  const [minutesFocused, setMinutesFocused] = useState(false);

  const getTime = () => {
    let hours = time.hours;
    let minutes = time.minutes;
    if (hours === null) hours = prevTime.hours;
    if (minutes === null) minutes = prevTime.minutes;
    if (limitHoursTo24) {
      if (hours < 0 || hours > 24) hours = prevTime.hours;
      if (!useAMPM) {
        if (hours === 24) hours = 0;
      } else {
        // 24 and 0 are always understood to be midnight when using AMPM
        if (hours === 24 || hours === 0) {
          hours = 0;
        } else {
          // If prevTime is PM, then new time should be PM
          if (prevTime.hours >= 12 && hours < 12) {
            hours += 12;
          }
          // This isn't the case for AM;
          // If the user is deliberately setting the tme above 12, then they WANT the time to switch to PM
          // If the prevTime is AM, then 12 is always understood as midnight
          if (prevTime.hours < 12 && hours === 12) hours = 0;
        }
      }
    }
    if (minutes === 60) minutes = 0;
    if (minutes < 0 || minutes > 59) minutes = prevTime.minutes;
    return { hours, minutes };
  };

  const close = () => {
    props.onClose();
    setTime({
      hours: props.time.getHours(),
      minutes: props.time.getMinutes(),
    });
    setPrevTime({
      hours: props.time.getHours(),
      minutes: props.time.getMinutes(),
    });
    setHoursFocused(false);
    setMinutesFocused(false);
  };

  useEffect(() => {
    setTime({
      hours: props.time.getHours(),
      minutes: props.time.getMinutes(),
    });
    setPrevTime({
      hours: props.time.getHours(),
      minutes: props.time.getMinutes(),
    });
  }, [props.time]);

  const timeIsAM = (() => {
    if (time.hours === null) return prevTime.hours < 12;
    if (time.hours < 0 || time.hours > 24) return prevTime.hours < 12;
    if (time.hours === 24 || time.hours === 0) return true;
    if (time.hours > 12) return false;
    return prevTime.hours < 12;
  })();

  if (!props.visible) return <></>;
  return (
    <Modal transparent>
      <TouchableWithoutFeedback onPress={close}>
        <View
          className="h-full w-full items-center justify-center px-12"
          style={{ backgroundColor: "#00000088" }}
        >
          <TouchableWithoutFeedback>
            <View className="w-full rounded-2xl bg-white p-4">
              <Text className="pb-8 text-xl font-bold">{props.title}</Text>
              <View className="flex-row items-center justify-center gap-2 pb-8">
                <View>
                  <View className="relative w-24 rounded-xl border border-gray-200 bg-gray-100 py-1">
                    <TextInput
                      inputMode="numeric"
                      className="text-center text-4xl"
                      placeholder={(() => {
                        if (useAMPM) {
                          if (prevTime.hours === 0) return "12";
                          if (prevTime.hours > 12)
                            return (prevTime.hours - 12)
                              .toString()
                              .padStart(2, "0");
                        }
                        return prevTime.hours.toString().padStart(2, "0");
                      })()}
                      placeholderClassName="text-gray-300"
                      value={(() => {
                        if (time.hours === null) return "";
                        if (hoursFocused) return time.hours.toString();
                        if (useAMPM) {
                          if (time.hours === 0) return "12";
                          if (time.hours > 12)
                            return (time.hours - 12)
                              .toString()
                              .padStart(2, "0");
                        }
                        return time.hours.toString().padStart(2, "0");
                      })()}
                      onFocus={() => {
                        setHoursFocused(true);
                        setTime({ hours: null, minutes: time.minutes });
                      }}
                      onBlur={() => {
                        setHoursFocused(false);
                        const verified = getTime();
                        setTime({
                          hours: verified.hours,
                          minutes: verified.minutes,
                        });
                        setPrevTime({
                          hours: verified.hours,
                          minutes: verified.minutes,
                        });
                      }}
                      onChangeText={(text) => {
                        if (text === "")
                          setTime({ hours: null, minutes: time.minutes });
                        if (text.match(/[^0-9]/)) return;
                        let value = parseInt(text);
                        if (isNaN(value)) return;
                        if (value < 0) value = -value;
                        setTime({ hours: value, minutes: time.minutes });
                      }}
                    ></TextInput>
                  </View>
                  <Text className="absolute -bottom-4 h-4 px-1 text-sm text-gray-500">
                    Hours
                  </Text>
                </View>
                <Text className="text-3xl">:</Text>
                <View className="relative">
                  <View className="w-24 rounded-xl border border-gray-200 bg-gray-100 py-1">
                    <TextInput
                      inputMode="numeric"
                      className="text-center text-4xl"
                      placeholder={prevTime.minutes.toString().padStart(2, "0")}
                      placeholderClassName="text-gray-300"
                      value={
                        time.minutes === null
                          ? ""
                          : minutesFocused
                            ? time.minutes.toString()
                            : time.minutes.toString().padStart(2, "0")
                      }
                      onFocus={() => {
                        setMinutesFocused(true);
                        setTime({ hours: time.hours, minutes: null });
                      }}
                      onBlur={() => {
                        setMinutesFocused(false);
                        const verified = getTime();
                        setTime({
                          hours: verified.hours,
                          minutes: verified.minutes,
                        });
                        setPrevTime({
                          hours: verified.hours,
                          minutes: verified.minutes,
                        });
                      }}
                      onChangeText={(text) => {
                        if (text === "")
                          setTime({ hours: time.hours, minutes: null });
                        if (text.match(/[^0-9]/)) return;
                        let value = parseInt(text);
                        if (isNaN(value)) return;
                        if (value < 0) value = -value;
                        setTime({ hours: time.hours, minutes: value });
                      }}
                    ></TextInput>
                  </View>
                  <Text className="absolute -bottom-4 h-4 px-1 text-sm text-gray-500">
                    Minutes
                  </Text>
                </View>
                {useAMPM && (
                  <View className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                    <View className="overflow-hidden">
                      <TouchableNativeFeedback
                        onPress={() => {
                          const verified = getTime();
                          const minutes = verified.minutes;
                          const hours = verified.hours;
                          if (hours === 0 || hours === 12) {
                            setTime({ hours: 12, minutes });
                            setPrevTime({ hours: 0, minutes });
                          } else if (hours > 12) {
                            setTime({ hours: hours - 12, minutes });
                            setPrevTime({ hours: hours - 12, minutes });
                          } else {
                            setTime({ hours, minutes });
                            setPrevTime({ hours, minutes });
                          }
                        }}
                      >
                        <View
                          className="border-b border-gray-200 p-2"
                          style={{
                            backgroundColor: timeIsAM
                              ? "#e5e7eb"
                              : "transparent",
                          }}
                        >
                          <Text
                            style={{
                              color: timeIsAM ? "black" : "#cccccc",
                            }}
                          >
                            AM
                          </Text>
                        </View>
                      </TouchableNativeFeedback>
                    </View>
                    <View className="overflow-hidden">
                      <TouchableNativeFeedback
                        onPress={() => {
                          const verified = getTime();
                          const minutes = verified.minutes;
                          const hours = verified.hours;
                          if (hours === 12 || hours === 0) {
                            setTime({ hours: 12, minutes });
                            setPrevTime({ hours: 12, minutes });
                          } else if (hours > 12) {
                            setTime({ hours: hours - 12, minutes });
                            setPrevTime({ hours: hours, minutes });
                          } else {
                            setTime({ hours: hours, minutes });
                            setPrevTime({ hours: hours + 12, minutes });
                          }
                        }}
                      >
                        <View
                          className="p-2"
                          style={{
                            backgroundColor: timeIsAM
                              ? "transparent"
                              : "#e5e7eb",
                          }}
                        >
                          <Text
                            style={{
                              color: timeIsAM ? "#cccccc" : "black",
                            }}
                          >
                            PM
                          </Text>
                        </View>
                      </TouchableNativeFeedback>
                    </View>
                  </View>
                )}
              </View>
              <View className="flex-row items-center justify-between gap-4">
                <View className="overflow-hidden rounded-full">
                  <TouchableNativeFeedback onPress={close}>
                    <View className="w-28 flex-row justify-center p-2">
                      <Text>Cancel</Text>
                    </View>
                  </TouchableNativeFeedback>
                </View>
                <View className="overflow-hidden rounded-full">
                  <TouchableNativeFeedback
                    onPress={() => {
                      const verified = getTime();
                      setTime(verified);
                      setPrevTime(verified);
                      setHoursFocused(false);
                      setMinutesFocused(false);
                      const hours = verified.hours;
                      const minutes = verified.minutes;

                      const newTime = new Date(props.time);
                      newTime.setHours(hours);
                      newTime.setMinutes(minutes);
                      newTime.setSeconds(0);
                      newTime.setMilliseconds(0);
                      props.onDone(newTime);
                    }}
                  >
                    <View className="w-28 flex-row justify-center p-2">
                      <Text className="font-bold">Done</Text>
                    </View>
                  </TouchableNativeFeedback>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
