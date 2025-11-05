import React from 'react';
import { View, Text } from 'react-native';
import { colors, spacing, typography } from '../components/theme';
import styles from '../styles/screens/AddAccountScreen.style';

export default function AddAccountScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nova Conta</Text>
      <Text style={styles.subtitle}>Em breve: formulário de conta (nome, tipo, características)…</Text>
    </View>
  );
}

// estilos movidos para styles/screens/AddAccountScreen.styles.js
