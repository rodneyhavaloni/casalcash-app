import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from './theme';
import styles from '../styles/components/Header.style';

export default function Header({ title, subtitle, right }) {
  return (
    <LinearGradient colors={[colors.green, colors.greenDark]} style={styles.container} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {!!right && <View>{right}</View>}
      </View>
    </LinearGradient>
  );
}

// estilos movidos para styles/components/Header.styles.js
