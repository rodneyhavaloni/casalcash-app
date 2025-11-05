import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { colors, radii, spacing, typography } from './theme';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/components/Button.style';

export default function Button({ label, onPress, icon, variant = 'primary', loading = false, style, textStyle }) {
  const bg = variant === 'primary' ? colors.green : variant === 'salmon' ? colors.salmon : '#F3F4F6';
  const fg = variant === 'primary' || variant === 'salmon' ? '#fff' : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      android_ripple={{ color: '#ffffff55' }}
      accessibilityRole="button"
      style={({ pressed }) => ([
        styles.button,
        { backgroundColor: bg },
        style,
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
      ])}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={20} color={fg} style={{ marginRight: 8 }} />}
          <Text style={[styles.label, { color: fg }, textStyle]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

// estilos movidos para styles/components/Button.styles.js
