import { usePanHandlers } from "@/hooks/animtedHooks";
import { useLayoutEffect, useRef } from "react";
import { Animated } from "react-native";
import {
  Modal,
  ScrollView,
  View,
  TouchableWithoutFeedback,
  useAnimatedValue,
} from "react-native";

export default function BottomSheet(props: {
  children?: React.ReactNode;
  onClose?: () => void;
  scrollEnabled?: boolean;
  initialHeight?: number;
  stableHeights: {
    stabilizeTo: number;
    whenAbove: number | null;
  }[];
  flickMultiplier?: number; // How much speed is multiplied by when adding to height
  onStabilize?: (height: number) => void;
  panBarColor?: string;
}) {
  const stableHeights = [...props.stableHeights];
  stableHeights.sort((a, b) => {
    if (a.whenAbove === null) return -1;
    if (b.whenAbove === null) return 1;
    return a.whenAbove - b.whenAbove;
  });
  if (stableHeights[0].whenAbove !== null)
    throw Error("First stable height must have whenAbove as null");
  stableHeights.reverse();
  const highestStable = stableHeights[0].stabilizeTo;
  const lowestStable = stableHeights[stableHeights.length - 1].stabilizeTo;

  const transY = useAnimatedValue(props.initialHeight ?? lowestStable);
  const stableAt = useRef(props.initialHeight ?? lowestStable);

  const panHandlers = usePanHandlers({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove(_, gestureState) {
      const height = gestureState.dy + stableAt.current;
      let dy = gestureState.dy;
      if (height > highestStable) {
        dy = highestStable - stableAt.current;
      }
      if (height < lowestStable) {
        dy = lowestStable - stableAt.current;
      }

      Animated.event([{ dy: transY }], {
        useNativeDriver: false,
      })({ dy });
    },
    onPanResponderRelease: (_, gestureState) => {
      const height = gestureState.dy + stableAt.current;
      const flick = gestureState.vy * (props.flickMultiplier || 0);
      const goTo = stableHeights.find((stable) =>
        stable.whenAbove === null ? true : height + flick > stable.whenAbove,
      )!.stabilizeTo;

      transY.flattenOffset();
      Animated.timing(transY, {
        toValue: goTo,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        props.onStabilize?.(goTo);
        transY.extractOffset();
        stableAt.current = goTo;
      });
    },
  });

  useLayoutEffect(() => {
    transY.setOffset(props.initialHeight ?? lowestStable);
  }, []);

  return (
    <Modal transparent={true}>
      <TouchableWithoutFeedback onPress={props.onClose}>
        <View
          className="flex h-full w-full justify-end"
          style={{ backgroundColor: "#44444488" }}
        >
          <Animated.View
            style={{
              transform: [{ translateY: transY }],
            }}
          >
            <TouchableWithoutFeedback>
              <View className="min-h-60 w-full rounded-t-3xl bg-white">
                <View
                  className="w-full flex-row items-center justify-center py-4"
                  {...panHandlers}
                >
                  <View
                    className="h-2 w-16 rounded-full"
                    style={{
                      backgroundColor: props.panBarColor || "#d1d5db",
                    }}
                  />
                </View>
                <ScrollView scrollEnabled={props.scrollEnabled ?? true}>
                  {props.children}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
