import React, { useState, useEffect, useRef } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { theme } from '../theme';
import { createCycle, addExpense } from '../utils/storage';
import { categories, getCategoryById } from '../utils/categories';
import InputField from '../components/InputField';
import { formatNominalInput, parseNominalInput } from '../utils/formatNominal';
import CalendarModal from '../components/CalendarModal';
import { standardCrops } from '../utils/crops';

export const TambahTanamanScreen = () => {
  const navigation = useNavigation();
  const scrollRef = useRef(null);

  // Crop Form States
  const [tanggal, setTanggal] = useState('');
  const [lahanName, setLahanName] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('Padi');
  const [customCropName, setCustomCropName] = useState('');

  // Initial Expenses Form States
  const [expenses, setExpenses] = useState([]);

  // UI States
  const [errors, setErrors] = useState({});
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [activeExpenseIndex, setActiveExpenseIndex] = useState(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Set default date to today YYYY-MM-DD on mount
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setTanggal(`${year}-${month}-${day}`);
  }, []);

  const addExpenseItem = () => {
    setExpenses((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        nama: '',
        kategori: 'pupuk',
        keteranganLainnya: '',
        nominal: '',
        errors: {},
      }
    ]);
  };

  const removeExpenseItem = (index) => {
    setExpenses((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleExpenseNamaChange = (index, text) => {
    setExpenses((prev) => prev.map((item, idx) => {
      if (idx === index) {
        const formatted = text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : '';
        return { ...item, nama: formatted };
      }
      return item;
    }));
  };

  const handleExpenseNominalChange = (index, text) => {
    setExpenses((prev) => prev.map((item, idx) => {
      if (idx === index) {
        const formatted = formatNominalInput(text);
        return { ...item, nominal: formatted };
      }
      return item;
    }));
  };

  const handleExpenseKeteranganChange = (index, text) => {
    setExpenses((prev) => prev.map((item, idx) => {
      if (idx === index) {
        const formatted = text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : '';
        return { ...item, keteranganLainnya: formatted };
      }
      return item;
    }));
  };

  const updateExpenseKategori = (index, catId) => {
    setExpenses((prev) => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, kategori: catId };
      }
      return item;
    }));
  };

  const handleCancel = () => {
    const hasUnsavedChanges =
      lahanName.trim() !== '' ||
      (selectedCrop === 'Lainnya' && customCropName.trim() !== '') ||
      selectedCrop !== 'Padi' ||
      expenses.length > 0;

    if (hasUnsavedChanges) {
      Alert.alert(
        'Batalkan Pengisian',
        'Apakah Anda yakin ingin membatalkan? Perubahan yang Anda buat tidak akan disimpan.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Ya, Keluar', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Validate form inputs
  const validateForm = () => {
    // Validate that at least one expense is added
    if (expenses.length === 0) {
      Alert.alert('Peringatan', 'Harap tambahkan minimal 1 pengeluaran.');
      return false;
    }
    let isValid = true;
    const newErrors = {};

    // Validate Lahan
    if (!lahanName.trim()) {
      newErrors.lahanName = 'Nama lahan/keterangan harus diisi';
      isValid = false;
    }

    // Validate Custom Crop
    if (selectedCrop === 'Lainnya' && !customCropName.trim()) {
      newErrors.customCropName = 'Nama tanaman kustom harus diisi';
      isValid = false;
    }

    // Validate Date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!tanggal) {
      newErrors.tanggal = 'Tanggal mulai tanam harus diisi';
      isValid = false;
    } else if (!dateRegex.test(tanggal)) {
      newErrors.tanggal = 'Format tanggal harus YYYY-MM-DD';
      isValid = false;
    }

    setErrors(newErrors);

    // Validate each optional initial expense
    const validatedExpenses = expenses.map((item) => {
      const itemErrors = {};
      if (!item.nama.trim()) {
        itemErrors.nama = 'Nama pengeluaran harus diisi';
        isValid = false;
      }
      if (item.kategori === 'lainnya' && !item.keteranganLainnya.trim()) {
        itemErrors.keteranganLainnya = 'Keterangan kategori lainnya harus diisi';
        isValid = false;
      }
      const parsedNominal = parseNominalInput(item.nominal);
      if (!item.nominal) {
        itemErrors.nominal = 'Nominal harus diisi';
        isValid = false;
      } else if (parsedNominal <= 0) {
        itemErrors.nominal = 'Nominal harus lebih dari 0';
        isValid = false;
      }
      return { ...item, errors: itemErrors };
    });

    setExpenses(validatedExpenses);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);

    setTimeout(async () => {
      try {
        const cropVal = selectedCrop === 'Lainnya' ? customCropName.trim() : selectedCrop;
        const combinedName = `${cropVal} di ${lahanName.trim()}`;

        // 1. Create the new crop cycle
        const newCycle = await createCycle(cropVal, combinedName, tanggal);

        // 2. Add each initial expense linked to this cycle
        for (const item of expenses) {
          const expenseData = {
            tanggal,
            nama_pengeluaran: item.nama.trim(),
            kategori: item.kategori,
            nominal: parseNominalInput(item.nominal),
            siklusId: newCycle.id,
            komoditas: cropVal,
          };
          if (item.kategori === 'lainnya' && item.keteranganLainnya.trim()) {
            expenseData.keterangan_lainnya = item.keteranganLainnya.trim();
          }
          await addExpense(expenseData);
        }

        setIsSaving(false);
        Alert.alert('Sukses', `Siklus tanam baru "${combinedName}" berhasil dibuat!`);
        navigation.goBack();
      } catch (err) {
        setIsSaving(false);
        Alert.alert('Gagal', 'Terjadi kesalahan saat membuat masa tanam baru.');
        console.error(err);
      }
    }, 800);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.onPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Simpan Tanaman</Text>
        </View>
        <MaterialIcons name="agriculture" size={28} color={theme.colors.onPrimary} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Data Tanaman & Lahan */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Informasi Lahan Tanam</Text>

            <InputField
              label="Tanggal Mulai Tanam"
              placeholder="Pilih Tanggal"
              value={tanggal}
              isDropdown={true}
              onPress={() => setDatePickerVisible(true)}
              error={errors.tanggal}
              icon="today"
            />

            <InputField
              label="Jenis Tanaman"
              placeholder="Pilih Tanaman"
              value={selectedCrop === 'Lainnya' ? (customCropName || 'Lainnya') : selectedCrop}
              isDropdown={true}
              onPress={() => setCropModalVisible(true)}
              error={errors.selectedCrop}
              icon="grass"
            />

            {selectedCrop === 'Lainnya' && (
              <InputField
                label="Nama Tanaman Baru"
                placeholder="Contoh: Semangka"
                value={customCropName}
                onChangeText={setCustomCropName}
                error={errors.customCropName}
                icon="eco"
                autoCapitalize="words"
              />
            )}

            <InputField
              label="Nama Lahan / Keterangan"
              placeholder="Contoh: Sawah Depan, Lahan Barat"
              value={lahanName}
              onChangeText={setLahanName}
              error={errors.lahanName}
              icon="map"
              autoCapitalize="sentences"
              maxLength={30}
            />
          </View>

          {/* Section 2: Biaya Awal (Opsional, Multi-Item) */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleText}>Biaya / Pengeluaran</Text>
          </View>

          {expenses.length === 0 ? (
            <Pressable
              onPress={addExpenseItem}
              style={({ pressed }) => [styles.emptyAddBtn, pressed && styles.pressed]}
            >
              <MaterialIcons name="add" size={24} color="#0e6c4a" />
              <Text style={styles.emptyAddBtnText}>Tambah Pengeluaran</Text>
            </Pressable>
          ) : (
            expenses.map((item, idx) => {
              const selectedCategoryLabel = item.kategori ? getCategoryById(item.kategori).label : '';

              return (
                <View key={item.id} style={styles.expenseCard}>
                  <View style={styles.expenseCardHeader}>
                    <Text style={styles.expenseCardTitle}>Biaya #{idx + 1}</Text>
                    <Pressable
                      onPress={() => removeExpenseItem(idx)}
                      style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
                    >
                      <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
                      <Text style={styles.deleteBtnText}>Hapus</Text>
                    </Pressable>
                  </View>

                  <InputField
                    label="Nama Pengeluaran"
                    placeholder="Contoh: Pembelian Benih Unggul"
                    value={item.nama}
                    onChangeText={(text) => handleExpenseNamaChange(idx, text)}
                    error={item.errors?.nama}
                    icon="label"
                    autoCapitalize="sentences"
                  />

                  <InputField
                    label="Kategori"
                    placeholder="Pilih Kategori"
                    value={selectedCategoryLabel}
                    isDropdown={true}
                    onPress={() => {
                      setActiveExpenseIndex(idx);
                      setCategoryModalVisible(true);
                    }}
                    icon="category"
                  />

                  {item.kategori === 'lainnya' && (
                    <InputField
                      label="Keterangan Lainnya"
                      placeholder="Contoh: Sewa genset, sewa pompa air"
                      value={item.keteranganLainnya}
                      onChangeText={(text) => handleExpenseKeteranganChange(idx, text)}
                      error={item.errors?.keteranganLainnya}
                      icon="edit-note"
                      autoCapitalize="sentences"
                    />
                  )}

                  <InputField
                    label="Nominal (Rp)"
                    placeholder="Contoh: 150.000"
                    value={item.nominal}
                    onChangeText={(text) => handleExpenseNominalChange(idx, text)}
                    keyboardType="numeric"
                    error={item.errors?.nominal}
                    icon="payments"
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              );
            })
          )}

          {expenses.length > 0 && (
            <Pressable
              onPress={addExpenseItem}
              style={({ pressed }) => [styles.addMoreBtn, pressed && styles.pressed]}
            >
              <MaterialIcons name="add" size={22} color="#0e6c4a" />
              <Text style={styles.addMoreBtnText}>Tambah Pengeluaran Lainnya</Text>
            </Pressable>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.saveButtonPressed,
                isSaving && styles.disabledButton,
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
                  <Text style={styles.saveButtonText}>Simpan Tanaman</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={handleCancel}
              disabled={isSaving}
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

      {/* Crop Selection Modal */}
      <Modal
        visible={cropModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCropModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCropModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Jenis Tanaman</Text>
            {standardCrops.map((crop) => {
              const isSelected = selectedCrop === crop.id;
              return (
                <Pressable
                  key={crop.id}
                  onPress={() => {
                    setSelectedCrop(crop.id);
                    setCropModalVisible(false);
                  }}
                  style={[
                    styles.modalOption,
                    isSelected && styles.modalOptionSelected,
                  ]}
                >
                  <Text style={styles.modalOptionIcon}>{crop.emoji}</Text>
                  <Text style={[
                    styles.modalOptionText,
                    isSelected && styles.modalOptionTextSelected,
                  ]}>
                    {crop.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setCropModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseButtonText}>Batal</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

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
            {categories.map((cat) => {
              const isSelected = activeExpenseIndex !== null && expenses[activeExpenseIndex]?.kategori === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    if (activeExpenseIndex !== null) {
                      updateExpenseKategori(activeExpenseIndex, cat.id);
                    }
                    setCategoryModalVisible(false);
                  }}
                  style={[
                    styles.modalOption,
                    isSelected && styles.modalOptionSelected,
                  ]}
                >
                  <MaterialIcons
                    name={cat.icon}
                    size={24}
                    color={isSelected ? theme.colors.primary : theme.colors.onSurface}
                    style={styles.modalOptionIcon}
                  />
                  <Text style={[
                    styles.modalOptionText,
                    isSelected && styles.modalOptionTextSelected,
                  ]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
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
        onClose={() => setDatePickerVisible(false)}
        onSelect={(dateString) => {
          setTanggal(dateString);
          setDatePickerVisible(false);
        }}
        value={tanggal}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#012d1d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#012d1d',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  headerTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#012d1d',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitleText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#012d1d',
  },
  emptyAddBtn: {
    backgroundColor: '#eff6e7',
    borderWidth: 1.5,
    borderColor: '#0e6c4a',
    borderStyle: 'dashed',
    borderRadius: 20,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  emptyAddBtnText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 15,
    color: '#0e6c4a',
    fontWeight: '700',
  },
  expenseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  expenseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expenseCardTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#707a6c',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteBtnText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 13,
    color: theme.colors.error,
    fontWeight: '700',
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0e6c4a',
    height: 48,
    borderRadius: 16,
    gap: 6,
    marginBottom: 24,
  },
  addMoreBtnText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    color: '#0e6c4a',
    fontWeight: '700',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  saveButton: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  saveButtonPressed: {
    backgroundColor: '#1b5e20',
    transform: [{ scale: 0.98 }],
  },
  saveButtonText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 8,
  },
  cancelButton: {
    height: 52,
    borderWidth: 2,
    borderColor: theme.colors.error,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonPressed: {
    backgroundColor: 'rgba(186, 26, 26, 0.05)',
  },
  cancelButtonText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    color: theme.colors.error,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  spinner: {
    marginRight: 4,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  footerText: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 10,
    color: '#707a6c',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 20,
    color: '#012d1d',
    marginBottom: 20,
    fontWeight: '700',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#f5f7f4',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  modalOptionSelected: {
    backgroundColor: '#eff6e7',
    borderColor: '#0e6c4a',
  },
  modalOptionIcon: {
    marginRight: 12,
  },
  modalOptionText: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 16,
    color: '#171d14',
    fontWeight: '600',
  },
  modalOptionTextSelected: {
    color: '#0e6c4a',
    fontWeight: '700',
  },
  modalCloseButton: {
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseButtonText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default TambahTanamanScreen;
