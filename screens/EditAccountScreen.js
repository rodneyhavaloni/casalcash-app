import React from 'react';
import { View, Text } from 'react-native';
import { colors, spacing, typography } from '../components/theme';
import styles from '../styles/screens/EditAccountScreen.style';

export default function EditAccountScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Editar Conta</Text>
      <Text style={styles.subtitle}>Em breve: edição da conta selecionada…</Text>
    </View>
  );
}

// estilos movidos para styles/screens/EditAccountScreen.styles.js
