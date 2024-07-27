import {
  Calendar,
  fromDateId,
  toDateId,
} from "@marceloterreiro/flash-calendar";
import { useEffect, useState } from "react";
import { Modal, Text, TouchableNativeFeedback, View } from "react-native";
import { TouchableWithoutFeedback } from "react-native-gesture-handler";
import { Icon } from "./Icon";

export default function DatePickerModal(props: {
  title: string;
  visible: boolean;
  date: Date;
  minDate?: Date;
  maxDate?: Date;
  onClose: () => void;
  onDone: (date: Date) => void;
}) {
  const today = toDateId(new Date());
  const [selectedDate, setSelectedDate] = useState(toDateId(props.date));
  const [month, setMonth] = useState({
    year: props.date.getFullYear(),
    month: props.date.getMonth(),
  });
  const isMaxMonth = (month: { year: number; month: number }) => {
    if (props.maxDate) {
      return (
        month.year === props.maxDate.getFullYear() &&
        month.month === props.maxDate.getMonth()
      );
    }

    return (
      month.year === new Date().getFullYear() &&
      month.month === new Date().getMonth()
    );
  };
  const incrementMonth = () => {
    if (isMaxMonth(month)) return;

    setMonth((prev) => ({
      year: prev.month === 11 ? prev.year + 1 : prev.year,
      month: prev.month === 11 ? 0 : prev.month + 1,
    }));
  };
  const decrementMonth = () => {
    setMonth((prev) => ({
      year: prev.month === 0 ? prev.year - 1 : prev.year,
      month: prev.month === 0 ? 11 : prev.month - 1,
    }));
  };
  const monthToString = (month: number) => {
    switch (month) {
      case 0:
        return "January";
      case 1:
        return "February";
      case 2:
        return "March";
      case 3:
        return "April";
      case 4:
        return "May";
      case 5:
        return "June";
      case 6:
        return "July";
      case 7:
        return "August";
      case 8:
        return "September";
      case 9:
        return "October";
      case 10:
        return "November";
      case 11:
        return "December";
    }
  };

  useEffect(() => {
    setSelectedDate(toDateId(props.date));
    setMonth({
      year: props.date.getFullYear(),
      month: props.date.getMonth(),
    });
  }, [props.date]);

  if (!props.visible) return <></>;
  return (
    <Modal transparent>
      <TouchableWithoutFeedback onPress={props.onClose}>
        <View
          className="h-full w-full items-center justify-center px-12"
          style={{ backgroundColor: "#00000088" }}
        >
          <TouchableWithoutFeedback>
            <View className="h-min w-full rounded-2xl bg-white p-4">
              <Text className="pb-2 text-xl font-bold">{props.title}</Text>
              <View className="flex-row items-center justify-between">
                <View className="overflow-hidden rounded-lg">
                  <TouchableNativeFeedback onPress={decrementMonth}>
                    <View className="py-1 pr-12">
                      <Icon name="material/chevron-left" />
                    </View>
                  </TouchableNativeFeedback>
                </View>
                <Text className="text-lg font-bold">
                  {monthToString(month.month)}, {month.year}
                </Text>
                <View className="overflow-hidden rounded-lg">
                  <TouchableNativeFeedback
                    onPress={incrementMonth}
                    disabled={isMaxMonth(month)}
                  >
                    <View className="py-1 pl-12">
                      <Icon
                        name="material/chevron-right"
                        color={isMaxMonth(month) ? "#CCC" : undefined}
                      />
                    </View>
                  </TouchableNativeFeedback>
                </View>
              </View>
              <View className="pb-4">
                <Calendar
                  calendarActiveDateRanges={[
                    {
                      startId: selectedDate,
                      endId: selectedDate,
                    },
                  ]}
                  calendarRowVerticalSpacing={0}
                  calendarRowHorizontalSpacing={0}
                  calendarMonthId={`${month.year}-${month.month + 1}-01`}
                  calendarMinDateId={
                    props.minDate ? toDateId(props.minDate) : "0000-00-00"
                  }
                  calendarMaxDateId={
                    props.maxDate ? toDateId(props.maxDate) : today
                  }
                  onCalendarDayPress={(dateID) => setSelectedDate(dateID)}
                  calendarColorScheme="light"
                  theme={{
                    itemWeekName: {
                      content: {
                        color: "#779",
                      },
                    },
                    rowMonth: {
                      container: {
                        display: "none",
                      },
                    },
                  }}
                />
              </View>
              <View className="flex-row items-center justify-between gap-4">
                <View className="overflow-hidden rounded-full">
                  <TouchableNativeFeedback
                    onPress={() => {
                      props.onClose();
                      setSelectedDate(toDateId(props.date));
                      setMonth({
                        year: props.date.getFullYear(),
                        month: props.date.getMonth(),
                      });
                    }}
                  >
                    <View className="w-28 flex-row justify-center p-2">
                      <Text>Cancel</Text>
                    </View>
                  </TouchableNativeFeedback>
                </View>
                <View className="overflow-hidden rounded-full">
                  <TouchableNativeFeedback
                    onPress={() => props.onDone(fromDateId(selectedDate))}
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
