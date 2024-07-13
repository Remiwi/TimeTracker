import { Text } from "react-native";
import { useEffect, useState } from "react";

export default function TimerText(props: {
  startTime: Date | undefined;
  stopTime?: Date | undefined;
  className?: string;
}) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    if (props.startTime === undefined || props.stopTime) return;
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [props.startTime, props.stopTime]);

  if (props.startTime === undefined)
    return <Text className={props.className}>X:XX:XX</Text>;

  const differenceInMilliseconds = props.stopTime
    ? props.stopTime.getTime() - props.startTime.getTime()
    : now.getTime() - props.startTime.getTime();
  const seconds = (Math.floor(differenceInMilliseconds / 1000) % 60)
    .toFixed(0)
    .padStart(2, "0");
  const minutes = (Math.floor(differenceInMilliseconds / 60_000) % 60)
    .toFixed(0)
    .padStart(2, "0");
  const hours = Math.floor(differenceInMilliseconds / 3_600_000);

  if (hours < 0) {
    return <Text className={props.className}>0:00:00</Text>;
  }

  return (
    <Text className={props.className}>
      {hours}:{minutes}:{seconds}
    </Text>
  );
}
