import { Easing } from 'react-native-reanimated';

export const iosAnimation = {
  pressInMs: 80,
  fadeMs: 140,
  reduceMotionMs: 70,
  easeOut: Easing.bezier(0.2, 0, 0, 1),
  spring: {
    damping: 26,
    stiffness: 360,
    mass: 0.9,
    overshootClamping: false,
    restDisplacementThreshold: 0.001,
    restSpeedThreshold: 0.001,
  },
  modalSpring: {
    damping: 30,
    stiffness: 320,
    mass: 0.95,
    overshootClamping: false,
    restDisplacementThreshold: 0.001,
    restSpeedThreshold: 0.001,
  },
};
