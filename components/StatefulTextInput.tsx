import { useState } from "react";
import { TextInput } from "react-native";

export default function StatefulTextInput(props: {
  value: string;
  onChange?: (text: string) => void;
  className?: string;
  placeholder?: string;
  placeholderClassName?: string;
  style?: any;
  placeholderStyle?: any;
}) {
  const [useSelfText, setUseSelfText] = useState(false);
  const [text, setText] = useState("");

  const val = useSelfText ? text : props.value;

  return (
    <TextInput
      className={props.className}
      placeholderClassName={props.placeholderClassName}
      style={val.trim() === "" ? props.placeholderStyle : props.style}
      value={val}
      onChangeText={setText}
      placeholder={props.placeholder}
      onFocus={() => {
        setText(props.value);
        setUseSelfText(true);
      }}
      onBlur={() => {
        setUseSelfText(false);
        props.onChange?.(text);
      }}
    />
  );
}
