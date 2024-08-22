import StyledTextInput from "@/components/TextInput";
import { useRef, useState } from "react";
import {
  Button,
  Linking,
  Text,
  TouchableNativeFeedback,
  View,
} from "react-native";
import { TextInput } from "react-native-gesture-handler";

const mailto = atob("cmVtaXZhdWdoYW5jb250YWN0QGdtYWlsLmNvbQ==");

export default function Contact() {
  const [title, setTitle] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [body, setBody] = useState("");
  const [failedSubmission, setFailedSubmission] = useState(false);

  const onPress = async () => {
    if (title === "" || body === "") {
      setFailedSubmission(true);
      return;
    }
    setFailedSubmission(false);

    await Linking.openURL(
      `mailto:${mailto}?subject=${title}&body=From: ${replyTo !== "[]" ? replyTo : "[no email given]"}\n\n${body}`,
    );
    setTitle("");
    setReplyTo("");
    setBody("");
  };

  const emailRef = useRef<null | TextInput>(null);
  const bodyRef = useRef<null | TextInput>(null);

  return (
    <View className="h-full w-full gap-4 bg-white p-2">
      <StyledTextInput
        bgColor="white"
        label="Title"
        borderColor={failedSubmission && title === "" ? "#cc2222" : undefined}
        labelColor={failedSubmission && title === "" ? "#cc2222" : undefined}
        value={title}
        onChange={(t) => setTitle(t)}
        keyboardType="default"
        returnKeyType="go"
        onSubmitEditing={() => emailRef.current?.focus()}
        blurOnSubmit={false}
      />
      <StyledTextInput
        bgColor="white"
        label="Email"
        placeholder="(Optional)"
        value={replyTo}
        onChange={(t) => setReplyTo(t)}
        keyboardType="email-address"
        returnKeyType="go"
        blurOnSubmit={false}
        onSubmitEditing={() => bodyRef.current?.focus()}
        ref={emailRef}
      />
      <StyledTextInput
        bgColor="white"
        label="Body"
        borderColor={failedSubmission && body === "" ? "#cc2222" : undefined}
        labelColor={failedSubmission && body === "" ? "#cc2222" : undefined}
        value={body}
        onChange={(t) => setBody(t)}
        textMinHeight={200}
        keyboardType="default"
        multiline
        ref={bodyRef}
      />
      <View className="flex-row justify-end">
        <View className="overflow-hidden rounded-full">
          <TouchableNativeFeedback onPress={onPress}>
            <View className="p-4 px-8">
              <Text className="text-lg font-bold">Submit</Text>
            </View>
          </TouchableNativeFeedback>
        </View>
      </View>
      <View className="flex-grow justify-end px-4 pb-6">
        <Text className="text-justify font-bold text-gray-600">
          Your feedback is important to me! Please feel free to use this to
          suggest features, report bugs, or ask for help!
        </Text>
      </View>
    </View>
  );
}
