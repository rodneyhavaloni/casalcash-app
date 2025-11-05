import React from 'react';
import { View, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors, spacing, typography } from '../components/theme';
import styles from '../styles/screens/ItemDetailScreen.style';

export default function ItemDetailScreen() {
  const route = useRoute();
  const { id } = route.params || {};
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detalhes do Item</Text>
      {id != null && (
        <Text style={styles.subtitle}>ID: {String(id)}</Text>
      )}
      <Text style={styles.subtitle}>Em breve: dados, status pago/parcelas, histórico…</Text>
    </View>
  );
}

// estilos migrados para styles/screens/ItemDetailScreen.css
