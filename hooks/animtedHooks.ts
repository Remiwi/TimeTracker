import { useEffect, useRef } from "react";
import { Animated, PanResponder, PanResponderCallbacks } from "react-native";

export function useAnimatedValue(defaultOffset: number = 0) {
  const ref = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    ref.setOffset(defaultOffset);
  }, []);
  return ref;
}

export function useAnimatedXY(
  defaultOffset: { x: number; y: number } = { x: 0, y: 0 },
) {
  const ref = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  useEffect(() => {
    ref.setOffset(defaultOffset);
  }, []);
  return ref;
}

export function usePanHandlers(config: PanResponderCallbacks) {
  return useRef(PanResponder.create(config)).current.panHandlers;
}
