import {
  Modal,
  ScrollView,
  View,
  TouchableWithoutFeedback,
} from "react-native";

export default function BottomSheet(props: {
  children?: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <Modal transparent={true}>
      <TouchableWithoutFeedback onPress={props.onClose}>
        <View
          className="flex h-full w-full justify-end"
          style={{ backgroundColor: "#44444488" }}
        >
          <TouchableWithoutFeedback>
            <View className="min-h-60 w-full rounded-t-3xl bg-white">
              <View className="w-full flex-row items-center justify-center py-4">
                <View className="h-2 w-14 rounded-full bg-gray-400" />
              </View>
              <ScrollView>{props.children}</ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
