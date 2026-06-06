import Animated, { LinearTransition } from "react-native-reanimated";
import { StyleSheet } from "react-native";
import { useToast } from "@/hooks/useToast";
import { Toast } from "./Toast";

export function ToastContainer() {
  const { toasts } = useToast();

  return (
    <Animated.View
      layout={LinearTransition}
      style={styles.container}
      pointerEvents="box-none"
    >
      {toasts.map((item) => (
        <Toast key={item.id} item={item} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24,
    right: 16,
    zIndex: 9999,
  },
});
