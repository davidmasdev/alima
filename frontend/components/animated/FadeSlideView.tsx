import React, { ReactNode, useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { iosAnimation } from '@/constants/animations';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

interface FadeSlideViewProps {
  children: ReactNode;
  triggerKey: string | number;
  style?: StyleProp<ViewStyle>;
  axis?: 'x' | 'y';
  distance?: number;
  minimumOpacity?: number;
}

export function FadeSlideView({
  children,
  triggerKey,
  style,
  axis = 'y',
  distance = 8,
  minimumOpacity = 0.92,
}: FadeSlideViewProps) {
  const reduceMotion = useReducedMotionPreference();
  const progress = useSharedValue(1);

  useEffect(() => {
    progress.value = 0;
    progress.value = reduceMotion
      ? withTiming(1, {
        duration: iosAnimation.reduceMotionMs,
        easing: iosAnimation.easeOut,
      })
      : withSpring(1, iosAnimation.spring);
  }, [progress, reduceMotion, triggerKey]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: minimumOpacity + progress.value * (1 - minimumOpacity),
    transform: [
      axis === 'x'
        ? { translateX: reduceMotion ? 0 : (1 - progress.value) * distance }
        : { translateY: reduceMotion ? 0 : (1 - progress.value) * distance },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
