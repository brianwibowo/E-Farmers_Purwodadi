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

export const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorUsername, setErrorUsername] = useState('');
  const [errorPhone, setErrorPhone] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [errorConfirm, setErrorConfirm] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUsernameChange = (text) => {
    if (text) {
      const formatted = text.charAt(0).toUpperCase() + text.slice(1);
      setUsername(formatted);
    } else {
      setUsername('');
    }
  };

  const handleRegister = async () => {
    // Reset errors
    setErrorUsername('');
    setErrorPhone('');
    setErrorPassword('');
    setErrorConfirm('');
    setGeneralError('');

    let hasError = false;

    if (username.trim() === '') {
      setErrorUsername('Username tidak boleh kosong.');
      hasError = true;
    } else if (username.length < 3) {
      setErrorUsername('Username minimal 3 karakter.');
      hasError = true;
    }

    const phoneRegex = /^[0-9]{9,15}$/;
    if (phone.trim() === '') {
      setErrorPhone('Nomor HP tidak boleh kosong.');
      hasError = true;
    } else if (!phoneRegex.test(phone.trim())) {
      setErrorPhone('Nomor HP tidak valid (9-15 digit angka).');
      hasError = true;
    }

    if (password === '') {
      setErrorPassword('Password tidak boleh kosong.');
      hasError = true;
    } else if (password.length < 4) {
      setErrorPassword('Password minimal 4 karakter.');
      hasError = true;
    }

    if (confirmPassword === '') {
      setErrorConfirm('Konfirmasi password tidak boleh kosong.');
      hasError = true;
    } else if (password !== confirmPassword) {
      setErrorConfirm('Kata sandi tidak cocok.');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      await register(username, password, phone);

      // On web, React Native Alert.alert might not be supported cleanly, so we check or just use simple alert.
      if (Platform.OS === 'web') {
        alert('Registrasi Berhasil! Silakan masuk dengan akun baru Anda.');
      } else {
        Alert.alert(
          'Registrasi Berhasil',
          'Akun Anda telah terdaftar. Silakan masuk menggunakan username dan kata sandi Anda.',
          [{ text: 'OK' }]
        );
      }

      navigation.goBack();
    } catch (err) {
      setGeneralError(err.message || 'Gagal mendaftar. Silakan coba lagi.');
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
        {/* Header Title */}
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

        {/* Card Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Daftar Akun</Text>
          <Text style={styles.formDesc}>Lengkapi form di bawah untuk membuat akun pencatatan keuangan Anda.</Text>

          {generalError ? (
            <View style={styles.errorBox}>
              <MaterialIcons name="error" size={20} color={theme.colors.error} />
              <Text style={styles.errorText}>{generalError}</Text>
            </View>
          ) : null}

          <InputField
            label="Username Baru"
            placeholder="Buat username Anda"
            value={username}
            onChangeText={handleUsernameChange}
            error={errorUsername}
            icon="person-add"
            autoCapitalize="words"
            textContentType="none"
            autoComplete="off"
          />

          <InputField
            label="Nomor Handphone (HP)"
            placeholder="Contoh: 08123456789"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            error={errorPhone}
            icon="phone"
            autoCapitalize="none"
            textContentType="none"
            autoComplete="off"
          />

          <InputField
            label="Kata Sandi (Password)"
            placeholder="Minimal 4 karakter"
            value={password}
            onChangeText={setPassword}
            error={errorPassword}
            secureTextEntry={true}
            icon="lock-open"
            autoCapitalize="none"
            textContentType="oneTimeCode"
            autoComplete="off"
          />

          <InputField
            label="Konfirmasi Kata Sandi"
            placeholder="Masukkan ulang kata sandi"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errorConfirm}
            secureTextEntry={true}
            icon="lock"
            autoCapitalize="none"
            textContentType="oneTimeCode"
            autoComplete="off"
          />

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            style={({ pressed }) => [
              styles.registerButton,
              pressed && styles.registerButtonPressed,
              loading && styles.registerButtonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
              <>
                <MaterialIcons name="person-add" size={24} color={theme.colors.onPrimary} />
                <Text style={styles.registerButtonText}>Daftar Sekarang</Text>
              </>
            )}
          </Pressable>

          <View style={styles.loginPrompt}>
            <Text style={styles.promptText}>Sudah memiliki akun?</Text>
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.loginLink}> Masuk Di Sini</Text>
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
    backgroundColor: theme.colors.primary,
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
    marginBottom: 32,
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
  registerButton: {
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
  registerButtonPressed: {
    backgroundColor: theme.colors.primaryContainer,
    transform: [{ scale: 0.98 }],
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onPrimary,
    marginLeft: 10,
  },
  loginPrompt: {
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
  loginLink: {
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
});

export default RegisterScreen;
