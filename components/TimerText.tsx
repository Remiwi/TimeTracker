import { Text } from "react-native";
import { Temporal } from "@js-temporal/polyfill";
import { useEffect, useState } from "react";

export default function TimerText(props: {
  startTime: Temporal.Instant | undefined;
  className?: string;
}) {
  const [now, setNow] = useState(Temporal.Now.instant());
  useEffect(() => {
    if (props.startTime === undefined) return;
    const interval = setInterval(() => {
      setNow(Temporal.Now.instant());
    }, 1000);
    return () => clearInterval(interval);
  }, [props.startTime]);

  if (props.startTime === undefined)
    return <Text className={props.className}>X:XX:XX</Text>;

  const duration = Temporal.Duration.from(now.since(props.startTime));
  const seconds = Math.floor(duration.total({ unit: "second" }) % 60)
    .toFixed(0)
    .padStart(2, "0");
  const minutes = Math.floor(duration.total({ unit: "minute" }) % 60)
    .toFixed(0)
    .padStart(2, "0");
  const hours = Math.floor(duration.total({ unit: "hour" })).toFixed(0);
  return (
    <Text className={props.className}>
      {hours}:{minutes}:{seconds}
    </Text>
  );
}
