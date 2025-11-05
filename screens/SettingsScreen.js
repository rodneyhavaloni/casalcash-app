import React from 'react';
import { View, Text } from 'react-native';
import Button from '../components/Button';
import { signOut } from '../services/supabaseClient';
import { colors, spacing, typography } from '../components/theme';
import styles from '../styles/screens/SettingsScreen.style';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurações</Text>
      <View style={{ height: 16 }} />
      <Button label="Sair" variant="salmon" onPress={signOut} />
    </View>
  );
}

// estilos movidos para styles/screens/SettingsScreen.styles.js
