import React, { ReactNode } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

interface AnimatedPressableProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  disabled?: boolean;
}

const springConfig = {
  damping: 18,
  stiffness: 280,
  mass: 0.8,
};

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  children,
  style,
  pressedScale = 0.97,
  disabled = false,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) {
  const reduceMotion = useReducedMotionPreference();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: GestureResponderEvent) => {
    if (!disabled && !reduceMotion) {
      scale.value = withSpring(pressedScale, springConfig);
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    if (!disabled && !reduceMotion) {
      scale.value = withSpring(1, springConfig);
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
