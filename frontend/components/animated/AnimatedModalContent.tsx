import React, { ReactNode, useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

interface AnimatedModalContentProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  visible?: boolean;
  slideDistance?: number;
}

export function AnimatedModalContent({
  children,
  style,
  visible = true,
  slideDistance = 12,
}: AnimatedModalContentProps) {
  const reduceMotion = useReducedMotionPreference();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: reduceMotion ? 80 : 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, reduceMotion, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: reduceMotion ? 0 : (1 - progress.value) * slideDistance,
      },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
