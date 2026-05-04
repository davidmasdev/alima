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
  const progress = useSharedValue(visible ? 1 : 0);
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    progress.value = reduceMotion
      ? withTiming(visible ? 1 : 0, {
        duration: iosAnimation.reduceMotionMs,
        easing: iosAnimation.easeOut,
      })
      : withSpring(visible ? 1 : 0, iosAnimation.modalSpring);
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: reduceMotion ? iosAnimation.reduceMotionMs : iosAnimation.fadeMs,
      easing: iosAnimation.easeOut,
    });
  }, [opacity, progress, reduceMotion, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      {
        translateY: reduceMotion ? 0 : (1 - progress.value) * slideDistance,
      },
      {
        scale: reduceMotion ? 1 : 0.97 + progress.value * 0.03,
      },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
