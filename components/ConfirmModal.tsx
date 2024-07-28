import {
  Modal,
  Text,
  TouchableNativeFeedback,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function ConfirmModal(props: {
  title: string;
  leftText: string;
  rightText: string;
  visible: boolean;
  onLeft: () => void;
  onRight: () => void;
  leftClassName?: string;
  rightClassName?: string;
}) {
  if (!props.visible) return <></>;
  return (
    <Modal transparent>
      <TouchableWithoutFeedback>
        <View
          className="h-full w-full items-center justify-center px-12"
          style={{ backgroundColor: "#00000088" }}
        >
          <TouchableWithoutFeedback>
            <View className="w-full rounded-2xl bg-white p-4">
              <View className="w-full items-center justify-center pb-12 pt-4">
                <Text className="text-center text-xl font-bold">
                  {props.title}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <View className="overflow-hidden rounded-full">
                  <TouchableNativeFeedback onPress={props.onLeft}>
                    <View className="w-28 flex-row justify-center p-2">
                      <Text
                        className={props.leftClassName ?? "text-lg font-bold"}
                      >
                        {props.leftText}
                      </Text>
                    </View>
                  </TouchableNativeFeedback>
                </View>
                <View className="overflow-hidden rounded-full">
                  <TouchableNativeFeedback onPress={props.onRight}>
                    <View className="w-28 flex-row justify-center p-2">
                      <Text
                        className={props.rightClassName ?? "text-lg font-bold"}
                      >
                        {props.rightText}
                      </Text>
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
