import React from 'react';
import { View, TextInput, Text } from 'react-native';
import { colors, radii, spacing, typography } from './theme';
import styles from '../styles/components/Input.style';

export default function Input({ label, error, style, right, inputStyle, ...props }) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, inputStyle || style]}
          placeholderTextColor={colors.muted}
          {...props}
        />
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

// estilos movidos para styles/components/Input.styles.js
