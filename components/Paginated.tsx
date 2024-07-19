import { usePanHandlers } from "@/hooks/animtedHooks";
import React, { useRef, useMemo } from "react";
import {
  Animated,
  View,
  useAnimatedValue,
  useWindowDimensions,
} from "react-native";

export default function Paginated<T>(props: {
  pages: T[];
  renderPage: (page: T, index: number) => React.ReactNode;
  onPageChange?: (page: number) => void;
  minPage?: number;
  maxPage?: number;
  setPageToRef?: React.MutableRefObject<((page: number) => void) | null>;
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

  if (props.setPageToRef !== undefined) {
    props.setPageToRef.current = (newPage: number) => {
      const pageDelta = newPage - page.current;
      if (pageDelta === 0) return;
      page.current = newPage;
      Animated.spring(scrollX, {
        toValue: -screen.width * pageDelta,
        useNativeDriver: true,
      }).start(() => {
        scrollX.setValue(0);
        scrollX.setOffset(screen.width * -page.current);
      });
      props.onPageChange?.(page.current);
    };
  }

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
