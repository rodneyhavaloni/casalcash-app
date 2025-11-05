import React from 'react';
import { View, Text } from 'react-native';
import { colors, radii, spacing, typography } from './theme';
import styles from '../styles/components/Card.style';

export default function Card({ title, subtitle, right, children, style, titleStyle }) {
  return (
    <View style={[styles.card, style]}>
      {(title || right) && (
        <View style={styles.header}>
          {!!title && <Text style={[styles.title, titleStyle]}>{title}</Text>}
          {!!right && <View>{right}</View>}
        </View>
      )}
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

// estilos movidos para styles/components/Card.styles.js
