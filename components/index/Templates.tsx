import {
  Animated,
  Easing,
  FlatList,
  PanResponder,
  Text,
  TouchableNativeFeedback,
  Vibration,
  View,
} from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { TemplateWithProject } from "@/apis/types";
import { atom, useAtom } from "jotai";
import { templatePageAtom } from "@/utils/atoms";
import {
  useDeepest,
  useEditTemplateMutation,
  useMoveManyTemplates,
  useTemplates,
} from "@/hooks/templateQueries";
import { useStartTemplateMutation } from "@/hooks/entryQueries";
import { TouchableWithoutFeedback } from "react-native-gesture-handler";
import Paginated from "@/components/Paginated";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useAnimatedXY } from "@/hooks/animtedHooks";

export default function Templates(props: {
  interactionsEnabled?: boolean;
  onTemplateCreate: (pos: { x: number; y: number }) => void;
  onTemplateEdit: (t: TemplateWithProject) => void;
}) {
  const templatesQuery = useTemplates();
  const templates = templatesQuery.data || [];

  const [page, setPage] = useAtom(templatePageAtom);
  const pageScrollMap = useRef(new Map<number, number>()).current;
  const num_pages = templates.reduce((acc, t) => Math.max(acc, t.page), 0) + 1;
  const pages: PageProps[] = Array(num_pages)
    .fill(1)
    .map((_, i) => ({
      page: i,
      templates: templates.filter((t) => t.page === i),
      small: true,
      interactionsEnabled: props.interactionsEnabled,
      onTemplateCreate: props.onTemplateCreate,
      onTemplateEdit: props.onTemplateEdit,
      setScrollAmount: (amount) => pageScrollMap.set(i, amount),
    }));

  return (
    <View className="h-full flex-shrink pt-6">
      <View className="h-8 flex-row items-center justify-center">
        <View className="flex-row justify-center gap-2">
          {Array(num_pages)
            .fill(0)
            .map((_, i) => (
              <View
                key={i}
                className="h-2 w-2 rounded-full bg-gray-400"
                style={{
                  backgroundColor: i === page ? "#9ca3af" : "#d1d5db",
                }}
              />
            ))}
        </View>
      </View>
      {templatesQuery.isSuccess && (
        <Paginated
          onPageChange={(p) => setPage(p)}
          minPage={0}
          maxPage={num_pages - 1}
          dependencies={[templates, props.interactionsEnabled]}
          pages={pages}
          renderPage={(page) => <Page {...page} />}
        />
      )}
    </View>
  );
}

type PageProps = {
  page: number;
  small: boolean;
  templates: TemplateWithProject[];
  interactionsEnabled?: boolean;
  onTemplateCreate: (pos: { x: number; y: number }) => void;
  onTemplateEdit: (t: TemplateWithProject) => void;
  setScrollAmount?: (amount: number) => void;
};

function Page(props: PageProps) {
  const deepestPos = useDeepest(props.page);

  useEffect(() => {
    props.setScrollAmount?.(0);
  }, []);

  return (
    <View className="flex-row">
      <FlatList
        onScroll={(e) => props.setScrollAmount?.(e.nativeEvent.contentOffset.y)}
        numColumns={props.small ? 3 : 2}
        key={props.small ? 3 : 2}
        scrollEnabled={props.interactionsEnabled}
        data={Array(
          (deepestPos.data && deepestPos.data.posy > 2
            ? deepestPos.data.posy + 2
            : 4) * 3,
        )}
        extraData={props.templates}
        contentContainerClassName="p-4 pb-0"
        renderItem={(data) => {
          const itemsPerRow = props.small ? 3 : 2;
          const posx = data.index % itemsPerRow;
          const posy = Math.floor(data.index / itemsPerRow);
          const template = props.templates.find(
            (t) => t.posx === posx && t.posy === posy,
          );

          return (
            <View
              className="relative h-36"
              style={{ width: props.small ? "33.3333%" : "50%" }}
            >
              {posx !== 0 && posy !== 0 && (
                <MaterialIcons
                  name="add"
                  size={12}
                  color="#cccccc"
                  className="absolute -left-1.5 -top-1.5"
                ></MaterialIcons>
              )}
              {template && (
                <Item
                  disabled={!props.interactionsEnabled}
                  pos={{ x: posx, y: posy }}
                  page={props.page}
                  isSmall={true}
                  template={template}
                  onLongPress={() => props.onTemplateEdit(template)}
                />
              )}
              {!template && (
                <TouchableWithoutFeedback
                  onLongPress={() => {
                    props.onTemplateCreate({ x: posx, y: posy });
                  }}
                >
                  <View className="h-full" />
                </TouchableWithoutFeedback>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const movingItemAtom = atom<null | {
  id: number;
  from: { x: number; y: number; page: number };
  to: { x: number; y: number; page: number };
}>(null);

function Item(props: {
  template: TemplateWithProject;
  pos: { x: number; y: number };
  page: number;
  onLongPress?: () => void;
  isSmall: boolean;
  disabled?: boolean;
}) {
  const viewDimensions = useRef({ width: 0, height: 0 }).current;

  const [page, _] = useAtom(templatePageAtom);
  const pageRef = useRef(page);
  pageRef.current = page; // We have to do this because this is a value, not a reference

  const [movingItem, setMovingItem] = useAtom(movingItemAtom);
  const movingItemRef = useRef(movingItem);
  movingItemRef.current = movingItem;

  const moveManyTemplatesMutation = useMoveManyTemplates();

  const shouldPanRef = useRef(false);
  const animPos = useAnimatedXY();
  const panHandlers = PanResponder.create({
    onMoveShouldSetPanResponder: () => shouldPanRef.current,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: Animated.event([{}, { dx: animPos.x, dy: animPos.y }], {
      useNativeDriver: false,
    }),
    onPanResponderRelease: (_, gestureState) => {
      const horizUnits = Math.round(gestureState.dx / viewDimensions.width);
      const vertUnits = Math.round(gestureState.dy / viewDimensions.height);
      setMovingItem({
        id: props.template.id,
        from: { ...props.pos, page: props.page },
        to: {
          x: props.pos.x + horizUnits,
          y: props.pos.y + vertUnits,
          page: pageRef.current,
        },
      });
      Animated.timing(animPos, {
        duration: 200,
        easing: Easing.exp,
        toValue: {
          x: horizUnits * viewDimensions.width,
          y: vertUnits * viewDimensions.height,
        },
        useNativeDriver: true,
      }).start(() => {
        console.log("Movement finished");

        // If the moving item isn't null, that means the cell we're moving to is empty!
        // We have to use the reference though because the real `movingItem` is going to be null no matter what
        //    because it is set to the value it was when item rendered
        if (movingItemRef.current === null) return;

        moveManyTemplatesMutation.mutate([
          {
            id: props.template.id,
            posx: movingItemRef.current.to.x,
            posy: movingItemRef.current.to.y,
            page: movingItemRef.current.to.page,
          },
        ]);
        setMovingItem(null);
      });
    },
  }).panHandlers;

  const deepestPos = useDeepest(props.page);
  const nextPos = {
    x: deepestPos.data ? (deepestPos.data.posx + 1) % 3 : 0,
    y: deepestPos.data
      ? deepestPos.data.posy + (deepestPos.data.posx === 2 ? 1 : 0)
      : 0,
  };

  useEffect(() => {
    // No moving item
    if (movingItem === null) return;
    // The moving item is myself
    if (movingItem.id === props.template.id) return;
    // I am not the item being targeted
    if (
      movingItem.to.x !== props.pos.x ||
      movingItem.to.y !== props.pos.y ||
      movingItem.to.page !== props.page
    )
      return;

    // Because moving the templates causes a rerender, we only want to do it once, so update both moving templates here
    const moves = [
      {
        id: movingItem.id,
        posx: movingItem.to.x,
        posy: movingItem.to.y,
        page: movingItem.to.page,
      },
    ];

    // If the item being placed here is from this page, swap to its position
    if (movingItem.from.page === props.page) {
      const dx = (movingItem.from.x - movingItem.to.x) * viewDimensions.width;
      const dy = (movingItem.from.y - movingItem.to.y) * viewDimensions.height;

      moves.push({
        id: props.template.id,
        posx: movingItem.from.x,
        posy: movingItem.from.y,
        page: movingItem.from.page,
      });

      Animated.timing(animPos, {
        duration: 200,
        easing: Easing.exp,
        toValue: { x: dx, y: dy },
        useNativeDriver: true,
      }).start(() => {
        moveManyTemplatesMutation.mutate(moves);
      });
      setMovingItem(null);
    }
    // Otherwise move to the last position of this page
    else {
      const dx = nextPos.x * viewDimensions.width;
      const dy = nextPos.y * viewDimensions.height;

      moves.push({
        id: props.template.id,
        posx: nextPos.x,
        posy: nextPos.y,
        page: props.page,
      });

      Animated.timing(animPos, {
        duration: 200,
        easing: Easing.exp,
        toValue: { x: dx, y: dy },
        useNativeDriver: true,
      }).start(() => {
        moveManyTemplatesMutation.mutate(moves);
      });
      setMovingItem(null);
    }
  }, [movingItem]);

  // omg my first time using useLayoutEffect so cool. loving zero flashing
  useLayoutEffect(() => {
    // If my ID has changed, then I've been swapped! Reset my animated postion
    animPos.setValue({ x: 0, y: 0 });
  }, [props.template.id]);

  const displayName =
    props.template.name ||
    props.template.description ||
    props.template.project_name ||
    "Unnamed";

  const startEntryMutation = useStartTemplateMutation();

  return (
    <Animated.View
      className="h-full justify-center"
      {...panHandlers}
      style={{
        transform: [{ translateX: animPos.x }, { translateY: animPos.y }],
      }}
      onLayout={(e) => {
        viewDimensions.width = e.nativeEvent.layout.width;
        viewDimensions.height = e.nativeEvent.layout.height;
      }}
    >
      <View className="overflow-hidden rounded-lg">
        <TouchableNativeFeedback
          onPress={() => {
            startEntryMutation.mutate(props.template);
          }}
          onLongPress={() => {
            //props.onLongPress
            Vibration.vibrate(80);
            shouldPanRef.current = true;
          }}
          onPressOut={() => {
            shouldPanRef.current = false;
          }}
          disabled={props.disabled}
        >
          <View className="items-center justify-center pb-1 pt-2">
            <View className="flex-row justify-center gap-1">
              <View className="w-4" />
              <View
                className="aspect-square w-5/12 items-center justify-center rounded-full"
                style={{
                  backgroundColor: props.template?.project_color || "#cccccc",
                }}
              >
                <MaterialCommunityIcons
                  name={(props.template.project_icon as any) || undefined}
                  size={props.isSmall ? 26 : 32}
                  color="white"
                />
              </View>
              <View className="w-4 gap-1">
                {props.template.tags.length > 0 && (
                  <MaterialCommunityIcons
                    name="tag"
                    size={12}
                    color="#bbbbbb"
                  />
                )}
              </View>
            </View>
            <Text className="pt-1">{displayName}</Text>
          </View>
        </TouchableNativeFeedback>
      </View>
    </Animated.View>
  );
}
