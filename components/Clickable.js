import React from 'react';
import { Pressable, Platform } from 'react-native';

/**
 * Clickable: wrapper de Pressable com feedback visual consistente
 * - Escala leve e opacidade ao pressionar
 * - Ripple no Android
 * - Mantém API simples: style pode ser objeto/array ou função
 */
export default function Clickable({
  children,
  style,
  onPress,
  disabled,
  androidRippleColor = '#E5E7EB',
  hitSlop = { top: 8, bottom: 8, left: 8, right: 8 },
  accessibilityRole,
  testID,
  ...rest
}) {
  // Permite style como função ou valor; injeta feedback adicional
  const styleWithFeedback = (state) => {
    const base = typeof style === 'function' ? style(state) : style;
    const pressedFx = {
      transform: [{ scale: state.pressed ? 0.98 : 1 }],
      opacity: state.pressed ? 0.9 : 1,
    };
    // Nota: Pressable aceita array de estilos
    return [base, pressedFx];
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={Platform.OS === 'android' ? { color: androidRippleColor, borderless: false } : undefined}
      style={styleWithFeedback}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      testID={testID}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
