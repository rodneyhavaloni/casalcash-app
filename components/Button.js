import React from 'react';
import { Pressable, Text, ActivityIndicator, View, Platform } from 'react-native';
import { colors, radii, spacing, typography } from './theme';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/components/Button.style';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

export default function Button({ label, onPress, icon, iconColor, variant = 'primary', loading = false, style, textStyle }) {
  const bg = variant === 'primary' ? colors.green : variant === 'salmon' ? colors.salmon : '#F3F4F6';
  const ripple = variant === 'primary' ? '#BBF7D0' : variant === 'salmon' ? '#FECACA' : '#E5E7EB';
  const fg = variant === 'primary' || variant === 'salmon' ? '#fff' : colors.text;
  const scale = useSharedValue(1);
  const bounce = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pressIn = () => { scale.value = withTiming(0.98, { duration: 70, easing: Easing.out(Easing.quad) }); };
  const pressOut = () => { scale.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) }); };
  return (
    <Animated.View style={bounce}>
      <Pressable
        onPress={(e) => { pressOut(); onPress && onPress(e); }}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={loading}
        android_ripple={{ color: ripple }}
        accessibilityRole="button"
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={({ pressed, hovered }) => ([
          styles.button,
          {
            backgroundColor: bg,
            // sombra base leve
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 3,
          },
          // hover (web): levanta um pouco
          hovered && Platform.OS === 'web' && {
            transform: [{ translateY: -1 }],
            shadowOpacity: 0.22,
            elevation: 6,
          },
          // pressed: leve mudança de opacidade (o scale já vem do Animated.View)
          pressed && {
            opacity: 0.92,
            shadowOpacity: 0.16,
            elevation: 2,
          },
          style,
        ])}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <View style={styles.row}>
            {icon && <Ionicons name={icon} size={20} color={iconColor || fg} style={{ marginRight: 8 }} />}
            <Text style={[styles.label, { color: fg }, textStyle]}>{label}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// estilos movidos para styles/components/Button.styles.js
