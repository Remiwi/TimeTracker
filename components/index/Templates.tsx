import {
  Animated,
  Easing,
  FlatList,
  PanResponder,
  ScrollView,
  Text,
  TouchableNativeFeedback,
  Vibration,
  View,
  useWindowDimensions,
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
import { Paginated, Page } from "@/components/Paginated";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAnimatedXY, usePanHandlers } from "@/hooks/animtedHooks";
import { useStateAsRef } from "@/hooks/misc";

export default function Templates(props: {
  interactionsEnabled?: boolean;
  onTemplateCreate: (pos: { x: number; y: number }) => void;
  onTemplateEdit: (t: TemplateWithProject) => void;
}) {
  const templatesQuery = useTemplates();
  const templates = templatesQuery.data || [];
  const num_pages = templates.reduce((acc, t) => Math.max(acc, t.page), 0) + 1;

  const [page, setPage] = useAtom(templatePageAtom);
  const paginatedRef = useRef<Paginated | undefined>(undefined);
  const pageScrollMap = useRef(new Map<number, number>()).current;

  const scrollviews = useRef(new Map<number, ScrollView | null>()).current;
  const registerPage = (page: number, ref: ScrollView | null) => {
    scrollviews.set(page, ref);
  };
  const scrollPage = (page: number, amount: number) => {
    const current = pageScrollMap.get(page) ?? 0;
    scrollviews.get(page)?.scrollTo({ y: current + amount, animated: false });
  };
  const changePage = (newPage: number) => {
    paginatedRef.current?.setPageTo(newPage);
  };

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
          ref={paginatedRef}
          onPageChange={(p) => setPage(p)}
          minPage={0}
          maxPage={num_pages - 1}
        >
          {Array(num_pages)
            .fill(1)
            .map((_, i) => (
              <Page key={i}>
                <Grid
                  page={i}
                  templates={templates.filter((t) => t.page === i)}
                  small={true}
                  interactionsEnabled={props.interactionsEnabled}
                  onTemplateCreate={props.onTemplateCreate}
                  onTemplateEdit={props.onTemplateEdit}
                  setScrollAmount={(amount) => pageScrollMap.set(i, amount)}
                  registerPage={registerPage}
                  scrollPage={scrollPage}
                  getPageScroll={(page) => pageScrollMap.get(page) ?? 0}
                  changePage={changePage}
                />
              </Page>
            ))}
        </Paginated>
      )}
    </View>
  );
}

function Grid(props: {
  page: number;
  small: boolean;
  templates: TemplateWithProject[];
  interactionsEnabled?: boolean;
  onTemplateCreate: (pos: { x: number; y: number }) => void;
  onTemplateEdit: (t: TemplateWithProject) => void;
  setScrollAmount?: (amount: number) => void;
  registerPage?: (page: number, ref: ScrollView | null) => void;
  scrollPage?: (page: number, amount: number) => void;
  getPageScroll?: (page: number) => number;
  changePage?: (newPage: number) => void;
}) {
  const screenDimensions = useWindowDimensions();

  const [pageTop, setPageTop] = useState(0);
  const [pageBottom, setPageBottom] = useState(9999999);
  const [pageLeft, setPageLeft] = useState(0);
  const [pageRight, setPageRight] = useState(9999999);

  const deepestPos = useDeepest(props.page);

  useEffect(() => {
    props.setScrollAmount?.(0);
  }, []);

  return (
    <ScrollView
      onLayout={(e) => {
        e.target.measure((_x, _y, width, height, pageX, pageY) => {
          setPageTop(pageY);
          setPageBottom(pageY + height);
          setPageLeft(pageX);
          setPageRight(pageX + width);
        });
      }}
      ref={(ref) => props.registerPage?.(props.page, ref)}
      onScroll={(e) => props.setScrollAmount?.(e.nativeEvent.contentOffset.y)}
      // numColumns={props.small ? 3 : 2}
      key={props.small ? 3 : 2}
      scrollEnabled={props.interactionsEnabled}
      contentContainerClassName="p-4 pb-0"
    >
      {Array(
        deepestPos.data && deepestPos.data.posy > 2
          ? deepestPos.data.posy + 2
          : 4,
      )
        .fill(Array(3).fill(1))
        .map((row: 1[], posy: number) => {
          return (
            <View className="flex-row" key={posy}>
              {row.map((_, posx: number) => {
                const template = props.templates.find(
                  (t) => t.posx === posx && t.posy === posy,
                );

                return (
                  <View
                    className="relative h-36"
                    style={{ width: props.small ? "33.3333%" : "50%" }}
                    key={posx}
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
                        scrollPage={props.scrollPage}
                        scrollBounds={{
                          top: pageTop + 50,
                          bottom: pageBottom - 50,
                          left:
                            pageLeft + 50 - props.page * screenDimensions.width,
                          right:
                            pageRight -
                            50 -
                            props.page * screenDimensions.width,
                        }}
                        getPageScroll={props.getPageScroll}
                        changePage={props.changePage}
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
              })}
            </View>
          );
        })}
    </ScrollView>
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
  scrollPage?: (page: number, amount: number) => void;
  scrollBounds?: { top: number; bottom: number; left: number; right: number };
  getPageScroll?: (page: number) => number;
  changePage?: (newPage: number) => void;
}) {
  const viewDimensions = useRef({ width: 0, height: 0 }).current;

  const [page, _] = useAtom(templatePageAtom);
  const pageRef = useStateAsRef(page); // We have to do this because this is a value, not a reference

  const [movingItem, setMovingItem] = useAtom(movingItemAtom);
  const movingItemRef = useStateAsRef(movingItem);

  const moveManyTemplatesMutation = useMoveManyTemplates();

  const shouldPanRef = useRef(false);
  const animPos = useAnimatedXY();
  const [shouldScroll, setShouldScroll] = useState(0);
  const boundsRef = useStateAsRef(props.scrollBounds);
  const panStartScroll = useRef(0);
  const requestPageTurn = useRef<NodeJS.Timeout | null>(null);
  const panHandlers = usePanHandlers({
    onMoveShouldSetPanResponder: () => shouldPanRef.current,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      const scrollHeight = props.getPageScroll?.(pageRef.current) ?? 0;
      animPos.setOffset({ x: 0, y: -scrollHeight });
      panStartScroll.current = scrollHeight;
    },
    onPanResponderMove: (_, gestureState) => {
      if (!!boundsRef.current) {
        if (gestureState.moveY < boundsRef.current.top) {
          setShouldScroll(-10);
        } else if (gestureState.moveY > boundsRef.current.bottom) {
          setShouldScroll(10);
        } else {
          setShouldScroll(0);
          if (gestureState.moveX < boundsRef.current.left) {
            if (requestPageTurn.current === null) {
              requestPageTurn.current = setTimeout(() => {
                if (pageRef.current <= 0) return;
                props.changePage?.(pageRef.current - 1);
                setTimeout(() => {
                  requestPageTurn.current = null;
                }, 1000);
              }, 1000);
            }
          } else if (gestureState.moveX > boundsRef.current.right) {
            if (requestPageTurn.current === null) {
              if (pageRef.current >= 2) return;
              props.changePage?.(pageRef.current + 1);
              requestPageTurn.current = setTimeout(() => {
                setTimeout(() => {
                  requestPageTurn.current = null;
                }, 1000);
              }, 1000);
            }
          } else if (requestPageTurn.current) {
            clearTimeout(requestPageTurn.current);
            requestPageTurn.current = null;
          }
        }
      }

      const scrollHeight = props.getPageScroll?.(pageRef.current) ?? 0;

      Animated.event([{ dx: animPos.x, dy: animPos.y }], {
        useNativeDriver: false,
      })({ dx: gestureState.dx, dy: gestureState.dy + scrollHeight });
    },
    onPanResponderEnd: () => {
      setShouldScroll(0);
    },
    onPanResponderRelease: (_, gestureState) => {
      const scrollDelta =
        (props.getPageScroll?.(pageRef.current) ?? 0) - panStartScroll.current;
      const dx = gestureState.dx;
      const dy = gestureState.dy + scrollDelta;
      // TODO: Make sure this can't be out of bounds!
      const horizUnits = Math.round(dx / viewDimensions.width);
      const vertUnits = Math.round(dy / viewDimensions.height);
      setMovingItem({
        id: props.template.id,
        from: { ...props.pos, page: props.page },
        to: {
          x: props.pos.x + horizUnits,
          y: props.pos.y + vertUnits,
          page: pageRef.current,
        },
      });
      animPos.flattenOffset();
      Animated.timing(animPos, {
        duration: 200,
        easing: Easing.exp,
        toValue: {
          x: horizUnits * viewDimensions.width,
          y: vertUnits * viewDimensions.height,
        },
        useNativeDriver: true,
      }).start(() => {
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
  });

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

  // Handles scrolling the current page based on the panning of this item
  useEffect(() => {
    const interval = setInterval(() => {
      if (shouldScroll === 0) return;
      props.scrollPage?.(props.page, shouldScroll);
    }, 10);
    return () => clearInterval(interval);
  }, [shouldScroll]);

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
