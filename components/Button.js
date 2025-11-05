import React from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import { colors, radii, spacing, typography } from './theme';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/components/Button.style';
import Clickable from './Clickable';

export default function Button({ label, onPress, icon, variant = 'primary', loading = false, style, textStyle }) {
  const bg = variant === 'primary' ? colors.green : variant === 'salmon' ? colors.salmon : '#F3F4F6';
  const fg = variant === 'primary' || variant === 'salmon' ? '#fff' : colors.text;
  return (
    <Clickable
      style={[styles.button, { backgroundColor: bg }, style]}
      onPress={onPress}
      disabled={loading}
      androidRippleColor="#ffffff55"
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={20} color={fg} style={{ marginRight: 8 }} />}
          <Text style={[styles.label, { color: fg }, textStyle]}>{label}</Text>
        </View>
      )}
    </Clickable>
  );
}

// estilos movidos para styles/components/Button.styles.js
