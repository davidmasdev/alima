import React, { ReactNode } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { iosAnimation } from '@/constants/animations';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

interface AnimatedPressableProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  disabled?: boolean;
}

const springConfig = {
  ...iosAnimation.spring,
};

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  children,
  style,
  pressedScale = 0.985,
  disabled = false,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) {
  const reduceMotion = useReducedMotionPreference();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: GestureResponderEvent) => {
    if (!disabled && !reduceMotion) {
      scale.value = withTiming(pressedScale, {
        duration: iosAnimation.pressInMs,
        easing: Easing.out(Easing.quad),
      });
      opacity.value = withTiming(0.92, {
        duration: iosAnimation.pressInMs,
        easing: Easing.out(Easing.quad),
      });
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    if (!disabled && !reduceMotion) {
      scale.value = withSpring(1, springConfig);
      opacity.value = withTiming(1, {
        duration: iosAnimation.fadeMs,
        easing: iosAnimation.easeOut,
      });
    }
    onPressOut?.(event);
  };

  return (
    <ReanimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </ReanimatedPressable>
  );
}
