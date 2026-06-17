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
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useAuth } from '../utils/AuthContext';
import { theme } from '../theme';
import InputField from '../components/InputField';
import { exportBackup, importBackup } from '../utils/backup';
import { clearAllData } from '../utils/storage';

export const ProfileScreen = ({ navigation }) => {
  const { user, updateProfile, logout } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [photoUri, setPhotoUri] = useState(user?.photoUri || null);
  
  // Password change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Validation errors
  const [errorUsername, setErrorUsername] = useState('');
  const [errorPhone, setErrorPhone] = useState('');
  const [errorConfirm, setErrorConfirm] = useState('');
  const [generalError, setGeneralError] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const handlePickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setImageModalVisible(false);
          alert('Maaf, kami membutuhkan izin akses galeri untuk mengganti foto profil.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: Platform.OS === 'web',
      });

      setImageModalVisible(false);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (Platform.OS === 'web' && result.assets[0].base64) {
          setPhotoUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
        } else {
          setPhotoUri(result.assets[0].uri);
        }
      }
    } catch (err) {
      setImageModalVisible(false);
      console.error('Failed to pick image', err);
      alert('Terjadi kesalahan saat memilih gambar.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setImageModalVisible(false);
          alert('Maaf, kami membutuhkan izin akses kamera untuk mengambil foto.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: Platform.OS === 'web',
      });

      setImageModalVisible(false);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (Platform.OS === 'web' && result.assets[0].base64) {
          setPhotoUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
        } else {
          setPhotoUri(result.assets[0].uri);
        }
      }
    } catch (err) {
      setImageModalVisible(false);
      console.error('Failed to take photo', err);
      alert('Terjadi kesalahan saat mengambil foto.');
    }
  };

  const handleRemovePhoto = () => {
    setImageModalVisible(false);
    setPhotoUri(null);
  };

  const handleSaveProfile = async () => {
    setErrorUsername('');
    setErrorPhone('');
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

    if (phone.trim() === '') {
      setErrorPhone('Nomor HP tidak boleh kosong.');
      hasError = true;
    } else if (phone.length < 10) {
      setErrorPhone('Nomor HP minimal 10 karakter.');
      hasError = true;
    }

    if (newPassword !== '' && newPassword.length < 4) {
      setGeneralError('Password baru minimal 4 karakter.');
      hasError = true;
    }

    if (newPassword !== '' && newPassword !== confirmPassword) {
      setErrorConfirm('Konfirmasi kata sandi tidak cocok.');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      await updateProfile(username, newPassword, photoUri, phone);
      
      if (Platform.OS === 'web') {
        alert('Profil berhasil diperbarui!');
      } else {
        Alert.alert('Sukses', 'Profil Anda telah berhasil diperbarui.', [{ text: 'OK' }]);
      }
      // Reset password fields after successful save
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setGeneralError(err.message || 'Gagal menyimpan profil.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmLog = window.confirm('Apakah Anda yakin ingin keluar dari aplikasi?');
      if (confirmLog) logout();
    } else {
      Alert.alert(
        'Keluar Akun',
        'Apakah Anda yakin ingin keluar dari aplikasi?',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Keluar', style: 'destructive', onPress: logout },
        ]
      );
    }
  };

  const handleResetData = () => {
    const performReset = async () => {
      try {
        await clearAllData();
        const msg = 'Semua data kas dan estimasi panen berhasil dihapus secara permanen.';
        if (Platform.OS === 'web') {
          alert(msg);
        } else {
          Alert.alert('Berhasil', msg, [{ text: 'OK' }]);
        }
      } catch (err) {
        const errorMsg = 'Gagal menghapus data.';
        if (Platform.OS === 'web') {
          alert(errorMsg);
        } else {
          Alert.alert('Gagal', errorMsg);
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmReset = window.confirm(
        'HAPUS SEMUA DATA?\n\nTindakan ini akan menghapus semua catatan transaksi kas dan estimasi panen Anda secara permanen dan tidak dapat dibatalkan.'
      );
      if (confirmReset) performReset();
    } else {
      Alert.alert(
        'Hapus Semua Data',
        'Apakah Anda yakin ingin menghapus semua catatan kas dan estimasi panen secara permanen? Tindakan ini tidak dapat dibatalkan.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Hapus Semua', style: 'destructive', onPress: performReset },
        ]
      );
    }
  };

  const handleExportBackup = async () => {
    setBackupLoading(true);
    try {
      const result = await exportBackup(user?.username);
      if (Platform.OS === 'web') {
        alert(result.message);
      } else {
        Alert.alert(
          result.success ? 'Berhasil' : 'Gagal',
          result.message,
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      const msg = 'Terjadi kesalahan saat membuat backup.';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Gagal', msg);
      }
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportBackup = () => {
    const doImport = async () => {
      setRestoreLoading(true);
      try {
        const result = await importBackup();
        if (result.message === 'Dibatalkan.') {
          setRestoreLoading(false);
          return;
        }
        if (Platform.OS === 'web') {
          alert(result.message);
        } else {
          Alert.alert(
            result.success ? 'Berhasil' : 'Gagal',
            result.message,
            [{ text: 'OK' }]
          );
        }
      } catch (err) {
        const msg = 'Terjadi kesalahan saat restore backup.';
        if (Platform.OS === 'web') {
          alert(msg);
        } else {
          Alert.alert('Gagal', msg);
        }
      } finally {
        setRestoreLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Data dari file backup akan digabungkan dengan data yang sudah ada. Lanjutkan?')) {
        doImport();
      }
    } else {
      Alert.alert(
        'Pulihkan Data',
        'Data dari file backup akan digabungkan dengan data yang ada sekarang. Data yang sudah ada tidak akan dobel.\n\nLanjutkan?',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Pulihkan', onPress: doImport },
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.navigate('MainTabs')}
          style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
        >
          <MaterialIcons name="arrow-back" size={26} color={theme.colors.onPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Ubah Profil</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Image Section */}
        <View style={styles.avatarContainer}>
          <Pressable 
            onPress={() => setImageModalVisible(true)}
            style={({ pressed }) => [styles.avatarWrapper, pressed && styles.avatarPressed]}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons name="person" size={72} color={theme.colors.onPrimaryContainer} />
              </View>
            )}
            <View style={styles.editBadge}>
              <MaterialIcons name="camera-alt" size={18} color={theme.colors.onPrimary} />
            </View>
          </Pressable>
          <Text style={styles.avatarText}>Ketuk untuk mengganti foto</Text>
        </View>

        {/* Form Fields Container */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Detail Akun</Text>
          
          {generalError ? (
            <View style={styles.errorBox}>
              <MaterialIcons name="error" size={20} color={theme.colors.error} />
              <Text style={styles.errorText}>{generalError}</Text>
            </View>
          ) : null}

          <InputField
            label="Username"
            placeholder="Username Anda"
            value={username}
            onChangeText={(text) => {
              if (text.length > 0) {
                setUsername(text.charAt(0).toUpperCase() + text.slice(1));
              } else {
                setUsername('');
              }
            }}
            error={errorUsername}
            icon="person"
            autoCapitalize="sentences"
          />

          <InputField
            label="Nomor HP"
            placeholder="Nomor HP Anda"
            value={phone}
            onChangeText={setPhone}
            error={errorPhone}
            icon="phone"
            keyboardType="phone-pad"
          />

          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Ubah Kata Sandi (Opsional)</Text>
          <Text style={styles.sectionDesc}>Biarkan kosong jika Anda tidak ingin mengubah kata sandi.</Text>

          <InputField
            label="Kata Sandi Baru"
            placeholder="Kata sandi baru"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={true}
            icon="lock-open"
            autoCapitalize="none"
          />

          <InputField
            label="Konfirmasi Kata Sandi Baru"
            placeholder="Ketik ulang kata sandi baru"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errorConfirm}
            secureTextEntry={true}
            icon="lock"
            autoCapitalize="none"
          />

          {/* Action Buttons */}
          <Pressable
            onPress={handleSaveProfile}
            disabled={loading}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              loading && styles.saveButtonDisabled
            ]}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
              <>
                <MaterialIcons name="save" size={24} color={theme.colors.onPrimary} />
                <Text style={styles.saveButtonText}>Simpan Perubahan</Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed
            ]}
          >
            <MaterialIcons name="logout" size={24} color={theme.colors.error} />
            <Text style={styles.logoutButtonText}>Keluar Akun</Text>
          </Pressable>

          <Pressable
            onPress={handleResetData}
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.resetButtonPressed
            ]}
          >
            <MaterialIcons name="delete-forever" size={24} color={theme.colors.error} />
            <Text style={styles.resetButtonText}>Hapus Semua Data</Text>
          </Pressable>
        </View>

        {/* Backup & Restore Section */}
        <View style={styles.backupCard}>
          <View style={styles.backupHeader}>
            <View style={styles.backupIconWrapper}>
              <MaterialIcons name="cloud-upload" size={28} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Cadangkan Data</Text>
              <Text style={styles.backupDesc}>
                Simpan salinan data ke file supaya tidak hilang. Berguna jika HP rusak atau ganti HP baru.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleExportBackup}
            disabled={backupLoading}
            style={({ pressed }) => [
              styles.backupButton,
              pressed && styles.backupButtonPressed,
              backupLoading && styles.saveButtonDisabled,
            ]}
          >
            {backupLoading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <>
                <View style={styles.backupBtnIcon}>
                  <MaterialIcons name="file-download" size={22} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.backupButtonText}>Simpan Cadangan</Text>
                  <Text style={styles.backupButtonSub}>Unduh semua data ke file</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={theme.colors.outline} />
              </>
            )}
          </Pressable>

          <Pressable
            onPress={handleImportBackup}
            disabled={restoreLoading}
            style={({ pressed }) => [
              styles.backupButton,
              { borderBottomWidth: 0 },
              pressed && styles.backupButtonPressed,
              restoreLoading && styles.saveButtonDisabled,
            ]}
          >
            {restoreLoading ? (
              <ActivityIndicator color={theme.colors.secondary} />
            ) : (
              <>
                <View style={[styles.backupBtnIcon, { backgroundColor: theme.colors.secondaryContainer }]}>
                  <MaterialIcons name="file-upload" size={22} color={theme.colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.backupButtonText}>Pulihkan Data</Text>
                  <Text style={styles.backupButtonSub}>Masukkan data dari file cadangan</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={theme.colors.outline} />
              </>
            )}
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            E-Farmers Purwodadi — Buku Kas Digital Petani
          </Text>
        </View>
      </ScrollView>

      {/* Image Picker Options Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setImageModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Foto Profil</Text>
            
            <Pressable onPress={handleTakePhoto} style={styles.modalOption}>
              <View style={styles.modalIconBg}>
                <MaterialIcons name="photo-camera" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.modalOptionText}>Ambil Foto dari Kamera</Text>
            </Pressable>

            <Pressable onPress={handlePickImage} style={styles.modalOption}>
              <View style={styles.modalIconBg}>
                <MaterialIcons name="photo-library" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.modalOptionText}>Pilih dari Galeri</Text>
            </Pressable>

            {photoUri ? (
              <Pressable onPress={handleRemovePhoto} style={styles.modalOption}>
                <View style={[styles.modalIconBg, { backgroundColor: theme.colors.errorContainer }]}>
                  <MaterialIcons name="delete" size={24} color={theme.colors.error} />
                </View>
                <Text style={[styles.modalOptionText, { color: theme.colors.error }]}>Hapus Foto Saat Ini</Text>
              </Pressable>
            ) : null}

            <Pressable 
              onPress={() => setImageModalVisible(false)}
              style={styles.modalCancelButton}
            >
              <Text style={styles.modalCancelText}>Batal</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    height: 72,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.marginMobile,
    elevation: 6,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  headerTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.marginMobile,
    paddingTop: 32,
    paddingBottom: 40,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  avatarPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: theme.colors.secondaryContainer,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.secondaryContainer,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.secondary,
    borderWidth: 2.5,
    borderColor: theme.colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 14,
    color: theme.colors.secondary,
    fontWeight: '600',
    marginTop: 12,
  },
  formCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.rounded.xl,
    padding: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  sectionTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 16,
  },
  sectionDesc: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 16,
    marginTop: -8,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
    marginVertical: 24,
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
  saveButton: {
    flexDirection: 'row',
    height: theme.spacing.touchTargetMin,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    elevation: 2,
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveButtonPressed: {
    backgroundColor: theme.colors.primaryContainer,
    transform: [{ scale: 0.98 }],
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onPrimary,
    marginLeft: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    height: theme.spacing.touchTargetMin,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.error,
    borderRadius: theme.rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  logoutButtonPressed: {
    backgroundColor: theme.colors.errorContainer,
    opacity: 0.9,
  },
  logoutButtonText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.error,
    marginLeft: 10,
  },
  resetButton: {
    flexDirection: 'row',
    height: theme.spacing.touchTargetMin,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.error,
    borderRadius: theme.rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  resetButtonPressed: {
    backgroundColor: theme.colors.errorContainer,
    opacity: 0.9,
  },
  resetButtonText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.error,
    marginLeft: 10,
  },
  // Backup Section
  backupCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.rounded.xl,
    padding: 20,
    marginTop: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  backupIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  backupDesc: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 2,
  },
  backupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  backupButtonPressed: {
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: theme.rounded.default,
  },
  backupBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  backupButtonText: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  backupButtonSub: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  footerText: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 12,
    color: theme.colors.outline,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.rounded.xl,
    borderTopRightRadius: theme.rounded.xl,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceContainer,
  },
  modalIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalOptionText: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 16,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  modalCancelButton: {
    height: theme.spacing.touchTargetMin,
    backgroundColor: theme.colors.outlineVariant,
    borderRadius: theme.rounded.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  modalCancelText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '700',
  },
});

export default ProfileScreen;
