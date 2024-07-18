import { usePanHandlers } from "@/hooks/animtedHooks";
import React, { useRef } from "react";
import {
  Animated,
  PanResponder,
  View,
  useAnimatedValue,
  useWindowDimensions,
} from "react-native";

const Paginated = React.memo(
  function Paginated(props: {
    children: React.ReactNode;
    onPageChange?: (page: number) => void;
    minPage?: number;
    maxPage?: number;
    dependencies?: any[];
  }) {
    const screen = useWindowDimensions();
    const page = useRef(0);
    const scrollX = useAnimatedValue(0);

    const panHandlers = usePanHandlers({
      // const panHandlers = PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 3 * Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 20
        );
      },
      onPanResponderGrant: () => console.log("Paginated stole panresponder"),
      onPanResponderMove: (_, gestureState) => {
        Animated.event([{ dx: scrollX }], {
          useNativeDriver: false,
        })({ dx: gestureState.dx });
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = screen.width / 4;
        if (
          gestureState.dx > threshold &&
          page.current > (props.minPage ?? 0)
        ) {
          page.current -= 1;
          Animated.spring(scrollX, {
            toValue: screen.width,
            useNativeDriver: true,
          }).start(() => {
            scrollX.setValue(0);
            scrollX.setOffset(screen.width * -page.current);
          });
        } else if (
          gestureState.dx < -threshold &&
          (props.maxPage ? page.current < props.maxPage : true)
        ) {
          page.current += 1;
          Animated.spring(scrollX, {
            toValue: -screen.width,
            useNativeDriver: true,
          }).start(() => {
            scrollX.setValue(0);
            scrollX.setOffset(screen.width * -page.current);
          });
        } else {
          Animated.spring(scrollX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
        props.onPageChange?.(page.current);
      },
    });
    // }).panHandlers;

    return (
      <View {...panHandlers}>
        <Animated.View
          className="flex-row"
          style={{
            flexDirection: "row",
            transform: [{ translateX: scrollX }],
          }}
        >
          {props.children}
        </Animated.View>
      </View>
    );
  },
  (prev, next) => {
    if (prev.dependencies === undefined || next.dependencies === undefined) {
      return false;
    }
    if (prev.dependencies.length !== next.dependencies.length) {
      throw "dependencies length must be the same";
    }
    for (let i = 0; i < prev.dependencies.length; i++) {
      if (prev.dependencies[i] !== next.dependencies[i]) return false;
    }
    return true;
  },
);

export default Paginated;
