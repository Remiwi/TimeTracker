import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Image,
  Modal,
  Text,
  TouchableNativeFeedback,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Paginated, Page } from "./Paginated";
import { useRouter } from "expo-router";

export default function Tutorial() {
  const { data: needsTutorial } = useQuery({
    queryKey: ["tutorialDone"],
    queryFn: async () => {
      const done = await AsyncStorage.getItem("tutorialDone");
      return done === "false" || done === null;
    },
  });
  const { mutate: setTutorialComplete } = useMutation({
    mutationKey: ["tutorialDone"],
    mutationFn: async () => {
      await AsyncStorage.setItem("tutorialDone", "true");
    },
  });

  const router = useRouter();

  if (!needsTutorial) return <></>;

  return (
    <Modal>
      <View className="h-full w-full">
        <Paginated minPage={0} maxPage={6}>
          <TutorialPage
            title="Organize your templates!"
            image={require("@/assets/tutorial/1.png")}
          >
            Create templates by holding down on an empty space in the template
            grid. You can edit the template by holding down on it before
            releasing your finger. To move templates around on the grid, hold
            down on a template and then drag it to where you want it to go.
          </TutorialPage>
          <TutorialPage
            title="Or don't!"
            image={require("@/assets/tutorial/2.png")}
          >
            You have as much space as you want, and you can place your templates
            wherever you want. Make the layout that suits you!
          </TutorialPage>
          <TutorialPage
            title="Start an entry in one tap!"
            image={require("@/assets/tutorial/3.png")}
          >
            Start a new entry (i.e. a new timer) for your template by tapping on
            it. Alternatively, you can start a new entry by pressing one of the
            quick action buttons near the top of the screen.
          </TutorialPage>
          <TutorialPage
            title="Edit your entry in one tap!"
            image={require("@/assets/tutorial/4.png")}
          >
            There are also quick action buttons for common edits you might like
            to make to your running timer. Try them out!
          </TutorialPage>
          <TutorialPage
            title="Make detailed edits easily"
            image={require("@/assets/tutorial/5.png")}
          >
            Open time timer by dragging down on the pull bar to access all the
            ways you might want to edit your entry.
          </TutorialPage>
          <TutorialPage
            title="That's it!"
            image={require("@/assets/tutorial/6.png")}
          >
            You can create projects in the Projects tab, review your past
            entries in the Activity tab, and change your sync/backup settings in
            the Settings tab. If you'd like to send feedback or report a bug,
            you can do so easily in the Contact tab.
          </TutorialPage>
          <TutorialPage
            title="Want to sync your data with Toggl?"
            image={require("@/assets/tutorial/7.png")}
            left={() => setTutorialComplete()}
            leftText="Skip"
            right={() => {
              setTutorialComplete();
              router.push("/settings");
            }}
            rightText="Setup Sync"
            leftClassname="text-xl font-bold"
            rightClassname="text-xl font-bold text-fuchsia-700"
          >
            This app works fine without syncing with Toggl. But if you are
            already using Toggl or want to have an option for running timers on
            other devices (like your computer), you can connect your Toggl
            account using you API key in the Settings tab. Note that enabling
            this feature does not mean you will need an internet connection to
            run entries here! This app can work offline and sync your data
            whenever you reconnect.
          </TutorialPage>
        </Paginated>
      </View>
    </Modal>
  );
}

function TutorialPage(props: {
  title: string;
  image: any;
  children: string;
  left?: () => void;
  right?: () => void;
  leftText?: string;
  rightText?: string;
  leftClassname?: string;
  rightClassname?: string;
}) {
  return (
    <Page>
      <TouchableWithoutFeedback>
        <View className="h-full w-full pt-12">
          <Text className="pb-4 text-center text-3xl font-bold">
            {props.title}
          </Text>
          <View className="items-center justify-center pb-4">
            <Image
              source={props.image}
              className="w-full"
              style={{
                width: 300,
                height: 450,
              }}
            />
          </View>
          <Text className="px-8 text-justify">{props.children}</Text>
          <View className="flex-grow flex-row items-end justify-between px-4 pb-6">
            {props.left ? (
              <View className="overflow-hidden rounded-full">
                <TouchableNativeFeedback onPress={props.left}>
                  <View className="w-32 items-center justify-center py-3">
                    <Text className={props.leftClassname}>
                      {props.leftText}
                    </Text>
                  </View>
                </TouchableNativeFeedback>
              </View>
            ) : (
              <View />
            )}
            {props.right ? (
              <View className="overflow-hidden rounded-full">
                <TouchableNativeFeedback onPress={props.right}>
                  <View className="w-32 items-center justify-center py-3">
                    <Text className={props.rightClassname}>
                      {props.rightText}
                    </Text>
                  </View>
                </TouchableNativeFeedback>
              </View>
            ) : (
              <View />
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Page>
  );
}
