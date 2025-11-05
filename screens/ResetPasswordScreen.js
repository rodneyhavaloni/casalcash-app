import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '../components/Input';
import Button from '../components/Button';
import styles from '../styles/screens/ResetPasswordScreen.style';
import { resetPassword } from '../services/supabaseClient';

export default function ResetPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSend = async () => {
    try {
      setLoading(true);
      await resetPassword(email.trim());
      Alert.alert('E-mail enviado', 'Verifique seu e-mail para redefinir a senha.');
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível enviar o e-mail de redefinição.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#ffffff", "#F0FFF4"]} style={styles.gradient}>
        <Text style={styles.title}>Recuperar conta</Text>
        <Input label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <View style={{ height: 8 }} />
        <Button label="Enviar" onPress={onSend} loading={loading} variant="salmon" style={{ width: '100%' }} />
        <View style={{ height: 8 }} />
        <Button label="Voltar" onPress={() => navigation.goBack()} variant="secondary" style={{ width: '100%' }} />
      </LinearGradient>
    </View>
  );
}
