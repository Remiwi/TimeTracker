import { useRef } from "react";

export function useStateAsRef<T>(state: T) {
  const ref = useRef(state);
  ref.current = state;
  return ref;
}
