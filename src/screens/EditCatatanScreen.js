import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { theme } from '../theme';
import { getExpenses, updateExpense, deleteExpense } from '../utils/storage';
import { categories, getCategoryById } from '../utils/categories';
import InputField from '../components/InputField';
import { formatNominalInput, parseNominalInput } from '../utils/formatNominal';
import CalendarModal from '../components/CalendarModal';

export const EditCatatanScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { expenseId } = route.params || {};

  // Form states
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState('');
  const [keteranganLainnya, setKeteranganLainnya] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [nominal, setNominal] = useState('');

  // UI States
  const [errors, setErrors] = useState({});
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing data
  useEffect(() => {
    const loadExpenseData = async () => {
      try {
        const expenses = await getExpenses();
        const found = expenses.find(item => item.id === expenseId);
        
        if (found) {
          setNama(found.nama_pengeluaran);
          setKategori(found.kategori);
          setKeteranganLainnya(found.keterangan_lainnya || '');
          setTanggal(found.tanggal);
          setNominal(formatNominalInput(found.nominal.toString()));
        } else {
          alert('Catatan tidak ditemukan');
          navigation.goBack();
        }
      } catch (err) {
        console.error('Error loading expense data', err);
        alert('Gagal memuat data');
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };

    if (expenseId) {
      loadExpenseData();
    } else {
      alert('ID Catatan tidak valid');
      navigation.goBack();
    }
  }, [expenseId]);

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};

    if (!nama.trim()) {
      newErrors.nama = 'Nama pengeluaran harus diisi';
    }

    if (!kategori) {
      newErrors.kategori = 'Pilih salah satu kategori';
    }

    if (kategori === 'lainnya' && !keteranganLainnya.trim()) {
      newErrors.keteranganLainnya = 'Keterangan kategori lainnya harus diisi';
    }

    // Date validation YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!tanggal) {
      newErrors.tanggal = 'Tanggal harus diisi';
    } else if (!dateRegex.test(tanggal)) {
      newErrors.tanggal = 'Format tanggal harus YYYY-MM-DD';
    } else {
      const parsed = Date.parse(tanggal);
      if (isNaN(parsed)) {
        newErrors.tanggal = 'Tanggal tidak valid';
      }
    }

    const parsedNominal = parseNominalInput(nominal);
    if (!nominal) {
      newErrors.nominal = 'Nominal harus diisi';
    } else if (parsedNominal <= 0) {
      newErrors.nominal = 'Nominal harus berupa angka lebih dari 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;

    setIsSaving(true);

    // Simulate save duration
    setTimeout(async () => {
      try {
        const updateData = {
          tanggal,
          nama_pengeluaran: nama.trim(),
          kategori,
          nominal: parseNominalInput(nominal),
        };
        if (kategori === 'lainnya' && keteranganLainnya.trim()) {
          updateData.keterangan_lainnya = keteranganLainnya.trim();
        } else {
          updateData.keterangan_lainnya = '';
        }
        await updateExpense(expenseId, updateData);
        
        setIsSaving(false);
        navigation.goBack();
      } catch (err) {
        setIsSaving(false);
        alert('Gagal memperbarui pengeluaran. Coba lagi.');
        console.error(err);
      }
    }, 800);
  };

  const handleDelete = () => {
    Alert.alert(
      'Hapus Pengeluaran',
      'Apakah Anda yakin ingin menghapus catatan pengeluaran ini?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteExpense(expenseId);
              alert('Catatan berhasil dihapus!');
              navigation.goBack();
            } catch (err) {
              alert('Gagal menghapus catatan.');
              console.error(err);
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const selectedCategoryLabel = kategori ? getCategoryById(kategori).label : '';

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Top Navbar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable 
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.onPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Pengeluaran</Text>
        </View>
        <MaterialIcons name="agriculture" size={28} color={theme.colors.onPrimary} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Form Container */}
          <View style={styles.formCard}>
            {/* Input Nama Pengeluaran */}
            <InputField
              label="Nama Pengeluaran"
              placeholder="Contoh: Pembelian Benih Padi"
              value={nama}
              onChangeText={(text) => {
                if (text.length > 0) {
                  setNama(text.charAt(0).toUpperCase() + text.slice(1));
                } else {
                  setNama('');
                }
              }}
              error={errors.nama}
              icon="label"
              autoCapitalize="sentences"
            />

            {/* Input Kategori Dropdown */}
            <InputField
              label="Kategori"
              placeholder="Pilih Kategori"
              value={selectedCategoryLabel}
              isDropdown={true}
              onPress={() => setCategoryModalVisible(true)}
              error={errors.kategori}
              icon="category"
            />

            {/* Input Keterangan Lainnya (shown when 'lainnya' selected) */}
            {kategori === 'lainnya' && (
              <InputField
                label="Keterangan Lainnya"
                placeholder="Contoh: Biaya transportasi"
                value={keteranganLainnya}
                onChangeText={(text) => {
                  if (text.length > 0) {
                    setKeteranganLainnya(text.charAt(0).toUpperCase() + text.slice(1));
                  } else {
                    setKeteranganLainnya('');
                  }
                }}
                error={errors.keteranganLainnya}
                icon="edit-note"
                autoCapitalize="sentences"
              />
            )}

            {/* Input Tanggal */}
            <InputField
              label="Tanggal"
              placeholder="Pilih Tanggal"
              value={tanggal}
              isDropdown={true}
              onPress={() => setDatePickerVisible(true)}
              error={errors.tanggal}
              icon="today"
            />

            {/* Input Nominal */}
            <InputField
              label="Nominal (Rp)"
              placeholder="Contoh: 500.000"
              value={nominal}
              onChangeText={(text) => setNominal(formatNominalInput(text))}
              keyboardType="numeric"
              error={errors.nominal}
              icon="payments"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleUpdate}
              disabled={isSaving || isDeleting}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.saveButtonPressed,
                (isSaving || isDeleting) && styles.disabledButton,
              ]}
            >
              {isSaving ? (
                <>
                  <ActivityIndicator size="small" color={theme.colors.onPrimary} style={styles.spinner} />
                  <Text style={styles.saveButtonText}>Menyimpan...</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="save" size={24} color={theme.colors.onPrimary} />
                  <Text style={styles.saveButtonText}>Perbarui Pengeluaran</Text>
                </>
              )}
            </Pressable>

            {/* Delete button (Crimson error style) */}
            <Pressable
              onPress={handleDelete}
              disabled={isSaving || isDeleting}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.deleteButtonPressed,
                (isSaving || isDeleting) && styles.disabledButton,
              ]}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={theme.colors.onError} />
              ) : (
                <>
                  <MaterialIcons name="delete" size={24} color={theme.colors.onError} />
                  <Text style={styles.deleteButtonText}>Hapus Pengeluaran</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => navigation.goBack()}
              disabled={isSaving || isDeleting}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Pengembang: Tim Pengabdian DPPM BIMA KEMDIKTISAINTEK UNNES 2026
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Selection Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setCategoryModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Kategori</Text>
            
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => {
                  setKategori(cat.id);
                  setCategoryModalVisible(false);
                }}
                style={[
                  styles.modalOption,
                  kategori === cat.id && styles.modalOptionSelected,
                ]}
              >
                <MaterialIcons 
                  name={cat.icon} 
                  size={24} 
                  color={kategori === cat.id ? theme.colors.primary : theme.colors.onSurface} 
                  style={styles.modalOptionIcon}
                />
                <Text style={[
                  styles.modalOptionText,
                  kategori === cat.id && styles.modalOptionTextSelected,
                ]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={() => setCategoryModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseButtonText}>Batal</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Date Picker Modal */}
      <CalendarModal
        visible={datePickerVisible}
        value={tanggal}
        onSelect={setTanggal}
        onClose={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  keyboardContainer: {
    flex: 1,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.marginMobile,
    paddingTop: 24,
    paddingBottom: 40,
  },
  pageSubtitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.stackSpace,
    lineHeight: 26,
  },
  formCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.containerPadding,
    marginBottom: theme.spacing.stackSpace,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: theme.spacing.stackSpace,
  },
  saveButton: {
    flexDirection: 'row',
    height: theme.spacing.touchTargetMin,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveButtonPressed: {
    backgroundColor: theme.colors.primaryContainer,
    transform: [{ scale: 0.98 }],
  },
  deleteButton: {
    flexDirection: 'row',
    height: theme.spacing.touchTargetMin,
    backgroundColor: theme.colors.error,
    borderRadius: theme.rounded.xl,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  deleteButtonPressed: {
    backgroundColor: '#93000a',
  },
  deleteButtonText: {
    ...theme.typography.buttonText,
    color: theme.colors.onError,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  spinner: {
    marginRight: 10,
  },
  saveButtonText: {
    ...theme.typography.buttonText,
    color: theme.colors.onPrimary,
    marginLeft: 8,
  },
  cancelButton: {
    height: theme.spacing.touchTargetMin,
    borderWidth: 2,
    borderColor: theme.colors.error,
    borderRadius: theme.rounded.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonPressed: {
    backgroundColor: 'rgba(186, 26, 26, 0.05)',
  },
  cancelButtonText: {
    ...theme.typography.buttonText,
    color: theme.colors.error,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    ...theme.typography.labelLg,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    fontWeight: '400',
    opacity: 0.7,
  },
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
    ...theme.typography.headlineMd,
    color: theme.colors.primary,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    height: theme.spacing.touchTargetMin,
    paddingHorizontal: 16,
    borderRadius: theme.rounded.default,
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  modalOptionSelected: {
    backgroundColor: theme.colors.secondaryContainer,
    borderColor: theme.colors.secondary,
  },
  modalOptionIcon: {
    marginRight: 12,
  },
  modalOptionText: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  modalOptionTextSelected: {
    color: theme.colors.onSecondaryContainer,
    fontWeight: '700',
  },
  modalCloseButton: {
    height: theme.spacing.touchTargetMin,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.rounded.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseButtonText: {
    ...theme.typography.buttonText,
    color: theme.colors.onPrimary,
  },
});

export default EditCatatanScreen;
