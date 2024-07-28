import React, { useRef } from "react";
import { Animated, View } from "react-native";
import { usePanHandlers, useAnimatedValue } from "@/hooks/animtedHooks";

type TopSheetRef = {
  setHeightTo: (height: number, callback?: () => void) => void;
};

export namespace TopSheet {
  export type Ref = TopSheetRef;
}

export const TopSheet = React.forwardRef(function (
  props: {
    children?: React.ReactNode;
    // The heights at which the sheet should stabilize to
    stableHeights: {
      stabilizeTo: number;
      whenAbove: number | null;
    }[];
    flickMultiplier?: number; // How much speed is multiplied by when adding to height
    give: number; // How far beyond the edges of the stable points the user can drag
    contentFixed?: boolean; // If content should move with sheet or be fixed to the screen
    panBarColor?: string;
    panBarBackgroundColor?: string;
    onPanStart?: () => void;
    onStabilize?: (height: number) => void;
    disablePan?: boolean;
    animatedValue?: Animated.Value;
  },
  ref: React.Ref<TopSheetRef>,
) {
  const canGrab = useRef(true);

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

  const ownedAnimatedValue = useAnimatedValue(lowestStable);
  const transY = useRef(props.animatedValue ?? ownedAnimatedValue).current;
  const stableAt = useRef(lowestStable);

  const panHandlers = usePanHandlers({
    onStartShouldSetPanResponder: () => canGrab.current,
    onPanResponderGrant: () => {
      props.onPanStart?.();
    },
    onPanResponderMove: (_, gestureState) => {
      const height = gestureState.dy + stableAt.current;
      let dy = gestureState.dy;
      if (height > highestStable + props.give) {
        dy = highestStable + props.give - stableAt.current;
      }
      if (height < lowestStable - props.give) {
        dy = lowestStable - props.give - stableAt.current;
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

      stableAt.current = goTo;

      props.onStabilize?.(goTo);

      transY.flattenOffset();
      canGrab.current = false;
      Animated.timing(transY, {
        toValue: goTo,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        transY.extractOffset();
        canGrab.current = true;
        stableAt.current = goTo;
      });
    },
  });

  React.useImperativeHandle(ref, () => ({
    setHeightTo: (height: number, callback?: () => void) => {
      canGrab.current = false;
      stableAt.current = height;
      props.onStabilize?.(height);
      transY.flattenOffset();
      Animated.timing(transY, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        transY.extractOffset();
        canGrab.current = true;
        stableAt.current = height;
        callback?.();
      });
    },
  }));

  return (
    <Animated.View
      className="absolute flex w-full justify-end rounded-b-3xl bg-white shadow-md shadow-black"
      style={{
        overflow: props.contentFixed ? "hidden" : "visible",
        height: highestStable + props.give,
        top: -highestStable - props.give,
        paddingTop: props.give,
        transform: [{ translateY: transY }],
      }}
    >
      <Animated.View
        className="flex w-full flex-grow justify-start"
        style={
          props.contentFixed
            ? {
                top: highestStable,
                transform: [
                  {
                    translateY: Animated.multiply(transY, -1),
                  },
                ],
              }
            : {}
        }
      >
        {props.children}
      </Animated.View>
      <View
        className="flex w-full items-center justify-center py-3"
        {...panHandlers}
        onStartShouldSetResponder={
          props.disablePan ? () => false : panHandlers.onStartShouldSetResponder
        }
        style={{
          backgroundColor: props.panBarBackgroundColor || "white",
        }}
      >
        <View
          className="h-2 w-16 rounded-full"
          style={{
            backgroundColor: props.disablePan
              ? "transparent"
              : props.panBarColor || "#d1d5db",
          }}
        />
      </View>
    </Animated.View>
  );
});
