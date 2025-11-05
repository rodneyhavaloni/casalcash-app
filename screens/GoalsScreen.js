import React from 'react';
import { View, Text } from 'react-native';
import { colors, spacing, typography } from '../components/theme';
import styles from '../styles/screens/GoalsScreen.style';

export default function GoalsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Metas Financeiras</Text>
      <Text style={styles.subtitle}>Em breve: criar/listar/editar metas e progresso…</Text>
    </View>
  );
}

// estilos movidos para styles/screens/GoalsScreen.styles.js
