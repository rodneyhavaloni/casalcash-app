import React, { useState } from 'react';
import { View, Text, Image, Linking, Alert, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import Input from '../components/Input';
import { colors, spacing, typography } from '../components/theme';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } from '../services/supabaseClient';
import styles from '../styles/screens/LoginScreen.style';

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const onLogin = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      // Supabase gerencia o redirecionamento e sessão; App.js escuta o onAuthStateChange
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível entrar com Google.');
    } finally {
      setLoading(false);
    }
  };

  const onLoginEmail = async () => {
    try {
      setLoading(true);
      await signInWithEmail(email.trim(), password);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível entrar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const onSignUp = () => {
    navigation.navigate('SignUp');
  };

  const onForgotPassword = async () => {
    try {
      setLoading(true);
      await resetPassword(email.trim());
      Alert.alert('E-mail enviado', 'Verifique seu e-mail para redefinir a senha.');
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
        {/* 1) Nome do app com ícone */}
        <View style={styles.logoBox}>
          <Ionicons name="heart" size={28} color={colors.salmon} />
          <Text style={styles.logo}>CasalCash</Text>
        </View>

        {/* 2) Ícone */}
        <View style={styles.illustration}>
          <Ionicons name="people" size={88} color={colors.greenDark} />
        </View>

        {/* 3) E-mail (largura total) */}
        <Input
          label="E-mail"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        {/* 4) Senha (largura total) */}
        <Input
          label="Senha"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          right={
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              android_ripple={{ color: '#E5E7EB' }}
              style={({ pressed }) => ([
                { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
                pressed ? { backgroundColor: '#F3F4F6' } : null,
              ])}
              accessibilityRole="button"
            >
              <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </Text>
            </Pressable>
          }
        />

        {/* 5) Botão Entrar */}
        <View style={{ height: 8 }} />
        <Button
          label="Entrar"
          onPress={onLoginEmail}
          loading={loading}
          variant="salmon"
          style={{ width: '100%' }}
        />

        {/* 6) Botão Criar conta */}
        <View style={{ height: 8 }} />
        <Button
          label="Criar conta"
          onPress={onSignUp}
          loading={false}
          variant="secondary"
          style={{ width: '100%' }}
        />

        {/* 7) Botão Entrar com Google */}
        <View style={{ height: 16 }} />
        <Button
          label="Entrar com Google"
          icon="logo-google"
          onPress={onLogin}
          loading={loading}
          variant="primary"
          style={{ width: '100%' }}
        />
      </LinearGradient>
    </View>
  );
}

// estilos movidos para styles/screens/LoginScreen.styles.js
