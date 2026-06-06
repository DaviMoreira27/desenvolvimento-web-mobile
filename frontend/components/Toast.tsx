import Animated, { FadeInLeft, FadeOutLeft } from "react-native-reanimated";
import { StyleSheet, Text } from "react-native";
import { VGTheme } from "@/constants/theme";
import { ToastItem } from "@/hooks/ToastContext";

interface ToastProps {
  item: ToastItem;
}

export function Toast({ item }: ToastProps) {
  const isSuccess = item.type === "success";
  return (
    <Animated.View
      entering={FadeInLeft}
      exiting={FadeOutLeft}
      style={[styles.container, isSuccess ? styles.success : styles.error]}
    >
      <Text style={[styles.message, isSuccess ? styles.successText : styles.errorText]}>
        {item.message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 300,
    padding: 14,
    borderRadius: VGTheme.radius.md,
    marginTop: 8,
    ...VGTheme.shadow.card,
  },
  success: {
    backgroundColor: VGTheme.colors.successBg,
  },
  error: {
    backgroundColor: VGTheme.colors.errorBg,
  },
  message: {
    fontSize: 14,
    fontWeight: "500",
  },
  successText: {
    color: VGTheme.colors.successText,
  },
  errorText: {
    color: VGTheme.colors.dangerText,
  },
});
