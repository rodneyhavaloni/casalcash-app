import React from 'react';
import { Pressable, Text, Platform, View } from 'react-native';
import { colors } from './theme';

export default function Chip({
  label,
  selected = false,
  onPress,
  style,
  textStyle,
  accessibilityLabel,
  left, // optional render function or React node for left content (icon/dot)
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      android_ripple={{ color: selected ? '#A7F3D0' : '#E5E7EB' }}
      style={({ pressed, hovered }) => ([
        {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: selected ? colors.green : '#E5E7EB',
          backgroundColor: selected ? '#ECFDF5' : '#FFFFFF',
          marginRight: 8,
          marginBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
        },
        hovered && Platform.OS === 'web' && { transform: [{ translateY: -1 }] },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.96 },
        style,
      ])}
    >
      {left ? (
        typeof left === 'function' ? left() : left
      ) : null}
      <Text
        style={[
          { color: selected ? colors.greenDark : '#374151', fontFamily: 'Poppins_500Medium' },
          left ? { marginLeft: 8 } : null,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
