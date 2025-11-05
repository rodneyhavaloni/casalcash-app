import React from 'react';
import { View, TextInput, Text } from 'react-native';
import { colors, radii, spacing, typography } from './theme';
import styles from '../styles/components/Input.style';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';

export default function Input({ label, error, style, right, inputStyle, onFocus, onBlur, ...props }) {
  const focused = useSharedValue(0);
  const containerAnim = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(focused.value ? 1.02 : 1, { duration: 120, easing: Easing.out(Easing.quad) }) }],
    shadowColor: '#000',
    shadowOpacity: focused.value ? 0.08 : 0,
    shadowRadius: focused.value ? 8 : 0,
    shadowOffset: { width: 0, height: focused.value ? 6 : 0 },
    elevation: focused.value ? 3 : 0,
  }));
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View style={[styles.inputContainer, containerAnim]}>
        <TextInput
          style={[
            styles.input,
            error ? { borderColor: '#F43F5E' } : null,
            inputStyle || style,
          ]}
          placeholderTextColor={colors.muted}
          onFocus={(e) => { focused.value = 1; onFocus && onFocus(e); }}
          onBlur={(e) => { focused.value = 0; onBlur && onBlur(e); }}
          {...props}
        />
        {right ? <View style={styles.right}>{right}</View> : null}
      </Animated.View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

// estilos movidos para styles/components/Input.styles.js
