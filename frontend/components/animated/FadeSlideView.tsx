import React, { ReactNode, useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

interface FadeSlideViewProps {
  children: ReactNode;
  triggerKey: string | number;
  style?: StyleProp<ViewStyle>;
  axis?: 'x' | 'y';
  distance?: number;
}

export function FadeSlideView({
  children,
  triggerKey,
  style,
  axis = 'y',
  distance = 8,
}: FadeSlideViewProps) {
  const reduceMotion = useReducedMotionPreference();
  const progress = useSharedValue(1);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: reduceMotion ? 80 : 160,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, reduceMotion, triggerKey]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      axis === 'x'
        ? { translateX: reduceMotion ? 0 : (1 - progress.value) * distance }
        : { translateY: reduceMotion ? 0 : (1 - progress.value) * distance },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
