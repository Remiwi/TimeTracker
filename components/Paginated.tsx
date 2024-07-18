import { usePanHandlers } from "@/hooks/animtedHooks";
import React, { useRef } from "react";
import {
  Animated,
  PanResponder,
  View,
  useAnimatedValue,
  useWindowDimensions,
} from "react-native";

function Paginated<T>(props: {
  pages: T[];
  renderPage: (page: T, index: number) => React.ReactNode;
  onPageChange?: (page: number) => void;
  minPage?: number;
  maxPage?: number;
  dependencies?: any[];
}) {
  const screen = useWindowDimensions();
  const page = useRef(0);
  const scrollX = useAnimatedValue(0);

  const panHandlers = usePanHandlers({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return (
        Math.abs(gestureState.dx) > 3 * Math.abs(gestureState.dy) &&
        Math.abs(gestureState.dx) > 20
      );
    },
    onPanResponderMove: (_, gestureState) => {
      Animated.event([{ dx: scrollX }], {
        useNativeDriver: false,
      })({ dx: gestureState.dx });
    },
    onPanResponderRelease: (_, gestureState) => {
      const threshold = screen.width / 4;
      if (gestureState.dx > threshold && page.current > (props.minPage ?? 0)) {
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

  return (
    <View {...panHandlers} className="flex-row">
      {props.pages.map((page, index) => (
        <Animated.View
          key={index}
          style={{
            width: screen.width,
            transform: [{ translateX: scrollX }],
          }}
        >
          {props.renderPage(page, index)}
        </Animated.View>
      ))}
    </View>
  );
}

function propsAreEqual(
  prev: { dependencies?: any[] },
  next: { dependencies?: any[] },
) {
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
}

export default React.memo(Paginated, propsAreEqual) as typeof Paginated;
