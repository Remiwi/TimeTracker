import { usePanHandlers } from "@/hooks/animtedHooks";
import React, { useRef, useMemo, useImperativeHandle } from "react";
import {
  Animated,
  View,
  useAnimatedValue,
  useWindowDimensions,
} from "react-native";

const PaginatedContext = React.createContext({
  width: undefined as number | undefined,
  scrollX: undefined as Animated.Value | undefined,
});

export type Paginated = {
  setPageTo: (newPage: number) => void;
};

export const Paginated = React.forwardRef(function (
  props: {
    children?: React.ReactNode;
    onPageChange?: (page: number) => void;
    minPage?: number;
    maxPage?: number;
  },
  ref: React.Ref<Paginated | undefined>,
) {
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

  useImperativeHandle(
    ref,
    () => ({
      setPageTo: (newPage: number) => {
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
      },
    }),
    [],
  );

  return (
    <PaginatedContext.Provider value={{ width: screen.width, scrollX }}>
      <View {...panHandlers} className="flex-row">
        {props.children}
      </View>
    </PaginatedContext.Provider>
  );
});

export function Page(props: { children: React.ReactNode }) {
  const { width, scrollX } = React.useContext(PaginatedContext);
  return (
    <Animated.View
      style={{
        width: width ?? 0,
        transform: [{ translateX: scrollX ?? 0 }],
      }}
    >
      {props.children}
    </Animated.View>
  );
}
