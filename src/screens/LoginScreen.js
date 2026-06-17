import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { theme } from '../theme';
import InputField from '../components/InputField';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorUsername, setErrorUsername] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Reset errors
    setErrorUsername('');
    setErrorPassword('');
    setGeneralError('');

    let hasError = false;
    if (username.trim() === '') {
      setErrorUsername('Username atau Nomor HP tidak boleh kosong.');
      hasError = true;
    }
    if (password === '') {
      setErrorPassword('Password tidak boleh kosong.');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      await login(username, password);
      // Navigation will automatically update since AuthProvider state changes
    } catch (err) {
      setGeneralError(err.message || 'Gagal masuk. Periksa kembali akun Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Logo & Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.brandTextContainer}>
            <Text style={styles.title}>E-Farmers</Text>
            <Text style={styles.subtitle}>Kabupaten Purwodadi</Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Masuk Akun</Text>
          <Text style={styles.formDesc}>Masukkan username dan kata sandi Anda untuk mengelola keuangan tani.</Text>

          {generalError ? (
            <View style={styles.errorBox}>
              <MaterialIcons name="error" size={20} color={theme.colors.error} />
              <Text style={styles.errorText}>{generalError}</Text>
            </View>
          ) : null}

          <InputField
            label="Username / Nomor HP"
            placeholder="Masukkan Username/No. HP"
            value={username}
            onChangeText={setUsername}
            error={errorUsername}
            icon="person"
            autoCapitalize="none"
            textContentType="none"
            autoComplete="off"
          />

          <InputField
            label="Kata Sandi (Password)"
            placeholder="Masukkan Kata Sandi"
            value={password}
            onChangeText={setPassword}
            error={errorPassword}
            secureTextEntry={true}
            icon="lock"
            autoCapitalize="none"
            textContentType="oneTimeCode"
            autoComplete="off"
          />

          <Pressable
            onPress={() => navigation.navigate('LupaPassword')}
            style={styles.forgotPasswordContainer}
          >
            <Text style={styles.forgotPasswordText}>Lupa Kata Sandi?</Text>
          </Pressable>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.loginButtonPressed,
              loading && styles.loginButtonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
              <>
                <MaterialIcons name="login" size={24} color={theme.colors.onPrimary} />
                <Text style={styles.loginButtonText}>Masuk Sekarang</Text>
              </>
            )}
          </Pressable>

          <View style={styles.registerPrompt}>
            <Text style={styles.promptText}>Belum punya akun?</Text>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}> Daftar Di Sini</Text>
            </Pressable>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pengembang: Tim Pengabdian DPPM UNNES 2026
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary, // Rich primary green background for portal feel
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.containerPadding,
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingBottom: 20,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    marginTop: 0,
  },
  logoWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  logo: {
    width: '125%',
    height: '125%',
  },
  brandTextContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.onPrimary,
    lineHeight: 28,
  },
  subtitle: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.rounded.xl,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  formTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 6,
  },
  formDesc: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.errorContainer,
    borderColor: theme.colors.error,
    borderWidth: 1,
    borderRadius: theme.rounded.default,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 14,
    color: theme.colors.onErrorContainer,
    marginLeft: 8,
    flex: 1,
  },
  loginButton: {
    flexDirection: 'row',
    height: theme.spacing.touchTargetMin,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    elevation: 2,
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loginButtonPressed: {
    backgroundColor: theme.colors.primaryContainer,
    transform: [{ scale: 0.98 }],
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onPrimary,
    marginLeft: 10,
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  promptText: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 15,
    color: theme.colors.onSurfaceVariant,
  },
  registerLink: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 15,
    color: theme.colors.secondary,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 14,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
});

export default LoginScreen;
