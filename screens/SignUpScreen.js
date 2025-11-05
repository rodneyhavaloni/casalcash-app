import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '../components/Input';
import Clickable from '../components/Clickable';
import Button from '../components/Button';
import { colors, spacing } from '../components/theme';
import styles from '../styles/screens/SignUpScreen.style';
import { signUpWithEmail } from '../services/supabaseClient';

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSignUp = async () => {
    try {
      setLoading(true);
      await signUpWithEmail(email.trim(), password);
      Alert.alert('Conta criada', 'Verifique seu e-mail para confirmar a conta.');
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#ffffff", "#F0FFF4"]} style={styles.gradient}>
        <Text style={styles.title}>Criar conta</Text>
        <Input label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          right={
            <Clickable
              onPress={() => setShowPassword((v) => !v)}
              accessibilityRole="button"
              androidRippleColor="#E5E7EB"
              style={({ pressed }) => ([
                { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
                pressed ? { backgroundColor: '#F3F4F6' } : null,
              ])}
            >
              <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </Text>
            </Clickable>
          }
        />
        <View style={{ height: 8 }} />
        <Button label="Criar conta" onPress={onSignUp} loading={loading} variant="salmon" style={{ width: '100%' }} />
        <View style={{ height: 8 }} />
        <Button label="Voltar" onPress={() => navigation.goBack()} variant="secondary" style={{ width: '100%' }} />
      </LinearGradient>
    </View>
  );
}
