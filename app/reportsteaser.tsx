import { useRouter } from "expo-router";
import { Text, TouchableNativeFeedback, View } from "react-native";

export default function Teaser() {
  const router = useRouter();

  return (
    <View className="h-full w-full items-center justify-center bg-white">
      <Text className="text-4xl font-bold">Coming soon!</Text>
      <Text className="px-2 pt-6 text-justify text-lg">
        There isn't currently any way in this app to see reports on how you've
        spent your time over the past day, week, and so on. I believe this
        feature will be an integral part of the experience once I've added it
        (so don't worry, it's coming!) but it means I want to give it some time
        to get it right. For now, I recommend setting up a Toggl account and
        adding your API key to use their reports system.
      </Text>
      <Text className="px-2 pb-6 pt-6 text-justify text-lg">
        Thank you for your patience! In the meantime, let me know what you'd
        like to see in this tab, or anything else, using the Contact page.
      </Text>
      <View className="overflow-hidden rounded-full">
        <TouchableNativeFeedback
          onPress={() => {
            router.push("contact");
          }}
        >
          <View className="items-center justify-center px-6 py-3">
            <Text className="text-2xl font-semibold">Contact Page</Text>
          </View>
        </TouchableNativeFeedback>
      </View>
    </View>
  );
}
