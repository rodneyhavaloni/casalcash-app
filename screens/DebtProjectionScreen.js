import React from 'react';
import { View, Text } from 'react-native';
import { colors, spacing, typography } from '../components/theme';
import styles from '../styles/screens/DebtProjectionScreen.style';

export default function DebtProjectionScreen({ route }) {
  const scope = route?.params?.scope || 'current-month';
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Projeção de Dívidas</Text>
      <Text style={styles.subtitle}>
        Escopo: {scope === 'current-month' ? 'Mês atual' : scope === 'next-month' ? 'Próximo mês' : String(scope)}
      </Text>
      <Text style={styles.subtitle}>Em breve: gráfico de linha, previsão da IA, detalhes das parcelas…</Text>
    </View>
  );
}

// estilos movidos para styles/screens/DebtProjectionScreen.styles.js
