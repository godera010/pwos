import { Link as RouterLink } from "expo-router";
import Animated from "react-native-reanimated";
import React from "react";
import {
  View as RNView,
  Text as RNText,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  TouchableHighlight as RNTouchableHighlight,
  TextInput as RNTextInput,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

// Dummy CSS Variable hook to avoid compilation errors, as we don't need react-native-css anymore
export const useCSSVariable = (variable: string) => {
  return "";
};

// CSS-enabled Link
export const Link = (
  props: React.ComponentProps<typeof RouterLink> & { className?: string }
) => {
  const Comp = RouterLink as any;
  return <Comp {...props} />;
};

// View
export type ViewProps = React.ComponentProps<typeof RNView> & {
  className?: string;
};

export const View = ({ className, ...props }: ViewProps) => {
  const Comp = RNView as any;
  return <Comp {...props} className={className} />;
};
View.displayName = "TW(View)";

// Text
export const Text = ({
  className,
  ...props
}: React.ComponentProps<typeof RNText> & { className?: string }) => {
  const Comp = RNText as any;
  return <Comp {...props} className={className} />;
};
Text.displayName = "TW(Text)";

// ScrollView
export const ScrollView = React.forwardRef<
  any,
  React.ComponentProps<typeof RNScrollView> & {
    className?: string;
    contentContainerClassName?: string;
  }
>(({ className, contentContainerClassName, ...props }, ref) => {
  const Comp = RNScrollView as any;
  return (
    <Comp
      ref={ref}
      {...props}
      className={className}
      contentContainerClassName={contentContainerClassName}
    />
  );
});
ScrollView.displayName = "TW(ScrollView)";

// Pressable
export const Pressable = ({
  className,
  ...props
}: React.ComponentProps<typeof RNPressable> & { className?: string }) => {
  const Comp = RNPressable as any;
  return <Comp {...props} className={className} />;
};
Pressable.displayName = "TW(Pressable)";

// TextInput
export const TextInput = ({
  className,
  ...props
}: React.ComponentProps<typeof RNTextInput> & { className?: string }) => {
  const Comp = RNTextInput as any;
  return <Comp {...props} className={className} />;
};
TextInput.displayName = "TW(TextInput)";

// AnimatedScrollView
export const AnimatedScrollView = ({
  className,
  contentContainerClassName,
  ...props
}: React.ComponentProps<typeof Animated.ScrollView> & {
  className?: string;
  contentContainerClassName?: string;
}) => {
  const Comp = Animated.ScrollView as any;
  return (
    <Comp
      {...props}
      className={className}
      contentContainerClassName={contentContainerClassName}
    />
  );
};

// TouchableHighlight
export const TouchableHighlight = ({
  className,
  ...props
}: React.ComponentProps<typeof RNTouchableHighlight> & { className?: string }) => {
  const Comp = RNTouchableHighlight as any;
  return <Comp {...props} className={className} />;
};
TouchableHighlight.displayName = "TW(TouchableHighlight)";

// SafeAreaView
export const SafeAreaView = ({
  className,
  ...props
}: React.ComponentProps<typeof RNSafeAreaView> & { className?: string }) => {
  const Comp = RNSafeAreaView as any;
  return <Comp {...props} className={className} />;
};
SafeAreaView.displayName = "TW(SafeAreaView)";
