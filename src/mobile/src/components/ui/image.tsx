import React from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { Image as RNImage } from "expo-image";

const AnimatedExpoImage = Animated.createAnimatedComponent(RNImage as any) as any;

export type ImageProps = any;

function CSSImage({
  style,
  source,
  ...props
}: any) {
  // Remap objectFit style to contentFit property
  const { objectFit, objectPosition, ...flattenedStyle } =
    StyleSheet.flatten(style) || {};

  return (
    <AnimatedExpoImage
      contentFit={objectFit}
      contentPosition={objectPosition}
      source={typeof source === "string" ? { uri: source } : source}
      style={flattenedStyle}
      {...props}
    />
  );
}

export const Image = ({ className, ...props }: any) => {
  const Comp = CSSImage as any;
  return <Comp {...props} className={className} />;
};

Image.displayName = "TW(Image)";
