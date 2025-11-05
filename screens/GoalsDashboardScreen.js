import React from 'react';
import { View, Text } from 'react-native';
import { colors, spacing, typography } from '../components/theme';
import styles from '../styles/screens/GoalsDashboardScreen.style';

export default function GoalsDashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard de Metas</Text>
      <Text style={styles.subtitle}>Em breve: gráfico circular e lista resumida de metas…</Text>
    </View>
  );
}

// estilos movidos para styles/screens/GoalsDashboardScreen.styles.js
