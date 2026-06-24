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
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { theme } from '../theme';
import { addExpense, getCycles, createCycle } from '../utils/storage';
import { categories, getCategoryById } from '../utils/categories';
import InputField from '../components/InputField';
import { formatNominalInput, parseNominalInput } from '../utils/formatNominal';
import CalendarModal from '../components/CalendarModal';
import { standardCrops } from '../utils/crops';

export const TambahCatatanScreen = () => {
  const navigation = useNavigation();
  const scrollRef = useRef(null);

  // Form states
  const [tanggal, setTanggal] = useState('');
  const [items, setItems] = useState([
    {
      id: Date.now(),
      nama: '',
      kategori: '',
      keteranganLainnya: '',
      siklusId: '',
      newCycleCrop: 'Padi',
      newCycleCropLainnya: '',
      newCycleLahanName: '',
      nominal: '',
      errors: {},
    }
  ]);
  const [activeItemIndex, setActiveItemIndex] = useState(null);
  const [activeCycles, setActiveCycles] = useState([]);

  // UI States
  const [errors, setErrors] = useState({});
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [cycleModalVisible, setCycleModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Set default date to today YYYY-MM-DD on mount in local timezone
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setTanggal(`${year}-${month}-${day}`);
  }, []);

  // Load active cycles
  const loadCycles = async () => {
    try {
      const allCycles = await getCycles();
      const active = allCycles.filter(c => c.status === 'active');
      setActiveCycles(active);
      
      // Update the initial item's default values based on loaded cycles
      setItems(prev => prev.map((item, idx) => {
        if (idx === 0) {
          return {
            ...item,
            siklusId: active.length > 0 ? active[0].id : 'new',
            newCycleLahanName: active.length > 0 ? '' : 'Lahan Utama',
          };
        }
        return item;
      }));
    } catch (err) {
      console.error('Error loading cycles in TambahCatatanScreen', err);
    }
  };

  useEffect(() => {
    loadCycles();
  }, []);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        nama: '',
        kategori: '',
        keteranganLainnya: '',
        siklusId: activeCycles.length > 0 ? activeCycles[0].id : 'new',
        newCycleCrop: 'Padi',
        newCycleCropLainnya: '',
        newCycleLahanName: activeCycles.length > 0 ? '' : 'Lahan Utama',
        nominal: '',
        errors: {},
      }
    ]);
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleNamaChange = (index, text) => {
    setItems((prev) => prev.map((item, idx) => {
      if (idx === index) {
        const formatted = text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : '';
        return { ...item, nama: formatted };
      }
      return item;
    }));
  };

  const handleKeteranganChange = (index, text) => {
    setItems((prev) => prev.map((item, idx) => {
      if (idx === index) {
        const formatted = text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : '';
        return { ...item, keteranganLainnya: formatted };
      }
      return item;
    }));
  };

  const handleNominalChange = (index, text) => {
    setItems((prev) => prev.map((item, idx) => {
      if (idx === index) {
        const formatted = formatNominalInput(text);
        return { ...item, nominal: formatted };
      }
      return item;
    }));
  };

  const updateItemKategori = (index, catId) => {
    setItems((prev) => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, kategori: catId };
      }
      return item;
    }));
  };

  const updateItemKomoditas = (index, cropId) => {
    setItems((prev) => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, newCycleCrop: cropId };
      }
      return item;
    }));
  };

  const handleKomoditasLainnyaChange = (index, text) => {
    setItems((prev) => prev.map((item, idx) => {
      if (idx === index) {
        const formatted = text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : '';
        return { ...item, newCycleCropLainnya: formatted };
      }
      return item;
    }));
  };

  const handleNewCycleLahanNameChange = (index, text) => {
    setItems((prev) => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, newCycleLahanName: text };
      }
      return item;
    }));
  };

  const updateItemSiklus = (index, cycleId) => {
    setItems((prev) => prev.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          siklusId: cycleId,
          newCycleLahanName: cycleId === 'new' ? 'Lahan Utama' : '',
        };
      }
      return item;
    }));
  };

  // Validate form inputs
  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    // Date validation YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!tanggal) {
      newErrors.tanggal = 'Tanggal harus diisi';
      isValid = false;
    } else if (!dateRegex.test(tanggal)) {
      newErrors.tanggal = 'Format tanggal harus YYYY-MM-DD';
      isValid = false;
    } else {
      const parsed = Date.parse(tanggal);
      if (isNaN(parsed)) {
        newErrors.tanggal = 'Tanggal tidak valid';
        isValid = false;
      }
    }
    setErrors(newErrors);

    const validatedItems = items.map((item) => {
      const itemErrors = {};
      if (!item.nama.trim()) {
        itemErrors.nama = 'Nama pengeluaran harus diisi';
        isValid = false;
      }
      if (!item.kategori) {
        itemErrors.kategori = 'Pilih salah satu kategori';
        isValid = false;
      }
      if (item.kategori === 'lainnya' && !item.keteranganLainnya.trim()) {
        itemErrors.keteranganLainnya = 'Keterangan kategori lainnya harus diisi';
        isValid = false;
      }
      if (!item.siklusId) {
        itemErrors.siklusId = 'Pilih atau buat siklus tanam';
        isValid = false;
      }
      if (item.siklusId === 'new') {
        if (!item.newCycleCrop) {
          itemErrors.newCycleCrop = 'Pilih jenis tanaman';
          isValid = false;
        }
        if (item.newCycleCrop === 'Lainnya' && !item.newCycleCropLainnya.trim()) {
          itemErrors.newCycleCropLainnya = 'Nama tanaman kustom harus diisi';
          isValid = false;
        }
        if (!item.newCycleLahanName.trim()) {
          itemErrors.newCycleLahanName = 'Nama lahan harus diisi';
          isValid = false;
        }
      }
      const parsedNominal = parseNominalInput(item.nominal);
      if (!item.nominal) {
        itemErrors.nominal = 'Nominal harus diisi';
        isValid = false;
      } else if (parsedNominal <= 0) {
        itemErrors.nominal = 'Nominal harus berupa angka lebih dari 0';
        isValid = false;
      }
      return { ...item, errors: itemErrors };
    });

    setItems(validatedItems);
    return isValid;
  };

  const resetForm = () => {
    setItems([
      {
        id: Date.now(),
        nama: '',
        kategori: '',
        keteranganLainnya: '',
        siklusId: activeCycles.length > 0 ? activeCycles[0].id : 'new',
        newCycleCrop: 'Padi',
        newCycleCropLainnya: '',
        newCycleLahanName: activeCycles.length > 0 ? '' : 'Lahan Utama',
        nominal: '',
        errors: {},
      }
    ]);
    setErrors({});
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setTanggal(`${year}-${month}-${day}`);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);

    setTimeout(async () => {
      try {
        for (const item of items) {
          let finalSiklusId = item.siklusId;
          let finalCrop = '';

          if (item.siklusId === 'new') {
            const cropVal = item.newCycleCrop === 'Lainnya' ? item.newCycleCropLainnya.trim() : item.newCycleCrop;
            const nameVal = item.newCycleLahanName.trim();
            const newCycle = await createCycle(cropVal, nameVal, tanggal);
            finalSiklusId = newCycle.id;
            finalCrop = cropVal;
          } else {
            const matchedCycle = activeCycles.find(c => c.id === item.siklusId);
            finalCrop = matchedCycle ? matchedCycle.crop : 'Padi';
          }

          const expenseData = {
            tanggal,
            nama_pengeluaran: item.nama.trim(),
            kategori: item.kategori,
            nominal: parseNominalInput(item.nominal),
            siklusId: finalSiklusId,
            komoditas: finalCrop,
          };
          if (item.kategori === 'lainnya' && item.keteranganLainnya.trim()) {
            expenseData.keterangan_lainnya = item.keteranganLainnya.trim();
          }
          await addExpense(expenseData);
        }

        setIsSaving(false);
        navigation.goBack();
      } catch (err) {
        setIsSaving(false);
        alert('Gagal menyimpan pengeluaran. Coba lagi.');
        console.error(err);
      }
    }, 800);
  };

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
          <Text style={styles.headerTitle}>Tambah Pengeluaran</Text>
        </View>
        <MaterialIcons name="agriculture" size={28} color={theme.colors.onPrimary} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Shared Date Card */}
          <View style={styles.dateCard}>
            <InputField
              label="Tanggal Transaksi"
              placeholder="Pilih Tanggal"
              value={tanggal}
              isDropdown={true}
              onPress={() => setDatePickerVisible(true)}
              error={errors.tanggal}
              icon="today"
              containerStyle={{ marginBottom: 0 }}
            />
          </View>

          {/* Dynamic Items Cards */}
          {items.map((item, idx) => {
            const selectedCategoryLabel = item.kategori ? getCategoryById(item.kategori).label : '';
            const selectedCycleLabel = item.siklusId === 'new'
              ? '[+] Buat Siklus Baru'
              : (activeCycles.find(c => c.id === item.siklusId)?.name || 'Pilih Siklus Tanam');

            return (
              <View key={item.id} style={styles.formCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>Pengeluaran #{idx + 1}</Text>
                  {items.length > 1 && (
                    <Pressable
                      onPress={() => removeItem(idx)}
                      style={({ pressed }) => [
                        styles.deleteHeaderButton,
                        pressed && styles.pressed
                      ]}
                    >
                      <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
                      <Text style={styles.deleteHeaderText}>Hapus</Text>
                    </Pressable>
                  )}
                </View>

                {/* Input Nama Pengeluaran */}
                <InputField
                  label="Nama Pengeluaran"
                  placeholder="Contoh: Pembelian Benih Padi"
                  value={item.nama}
                  onChangeText={(text) => handleNamaChange(idx, text)}
                  error={item.errors?.nama}
                  icon="label"
                  autoCapitalize="sentences"
                />

                {/* Input Kategori Dropdown */}
                <InputField
                  label="Kategori"
                  placeholder="Pilih Kategori"
                  value={selectedCategoryLabel}
                  isDropdown={true}
                  onPress={() => {
                    setActiveItemIndex(idx);
                    setCategoryModalVisible(true);
                  }}
                  error={item.errors?.kategori}
                  icon="category"
                />

                {/* Input Keterangan Lainnya (shown when 'lainnya' selected) */}
                {item.kategori === 'lainnya' && (
                  <InputField
                    label="Keterangan Lainnya"
                    placeholder="Contoh: Biaya transportasi"
                    value={item.keteranganLainnya}
                    onChangeText={(text) => handleKeteranganChange(idx, text)}
                    error={item.errors?.keteranganLainnya}
                    icon="edit-note"
                    autoCapitalize="sentences"
                  />
                )}

                {/* Input Siklus Tanam Dropdown */}
                <InputField
                  label="Siklus Tanam"
                  placeholder="Pilih Siklus Tanam"
                  value={selectedCycleLabel}
                  isDropdown={true}
                  onPress={() => {
                    setActiveItemIndex(idx);
                    setCycleModalVisible(true);
                  }}
                  error={item.errors?.siklusId}
                  icon="sync"
                />

                {/* Form Inline Siklus Baru */}
                {item.siklusId === 'new' && (
                  <View style={{ marginTop: 8 }}>
                    {/* Input Jenis Tanaman */}
                    <InputField
                      label="Jenis Tanaman (Siklus Baru)"
                      placeholder="Pilih Jenis Tanaman"
                      value={item.newCycleCrop === 'Lainnya' ? (item.newCycleCropLainnya || 'Lainnya') : item.newCycleCrop}
                      isDropdown={true}
                      onPress={() => {
                        setActiveItemIndex(idx);
                        setCropModalVisible(true);
                      }}
                      error={item.errors?.newCycleCrop}
                      icon="grass"
                    />

                    {/* Input Tanaman Lainnya (shown when 'Lainnya' selected) */}
                    {item.newCycleCrop === 'Lainnya' && (
                      <InputField
                        label="Nama Tanaman Baru"
                        placeholder="Contoh: Tomat"
                        value={item.newCycleCropLainnya}
                        onChangeText={(text) => handleKomoditasLainnyaChange(idx, text)}
                        error={item.errors?.newCycleCropLainnya}
                        icon="eco"
                        autoCapitalize="words"
                      />
                    )}

                    {/* Input Nama Lahan */}
                    <InputField
                      label="Nama Lahan / Keterangan"
                      placeholder="Contoh: Lahan Utama, Lahan Belakang"
                      value={item.newCycleLahanName}
                      onChangeText={(text) => handleNewCycleLahanNameChange(idx, text)}
                      error={item.errors?.newCycleLahanName}
                      icon="map"
                      autoCapitalize="sentences"
                    />
                  </View>
                )}

                {/* Input Nominal & Batch Action Row */}
                <View style={styles.nominalRow}>
                  <View style={styles.nominalInputWrapper}>
                    <InputField
                      label="Nominal (Rp)"
                      placeholder="Contoh: 500.000"
                      value={item.nominal}
                      onChangeText={(text) => handleNominalChange(idx, text)}
                      keyboardType="numeric"
                      error={item.errors?.nominal}
                      icon="payments"
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={styles.actionButtonsCol}>
                    {idx === items.length - 1 && (
                      <Pressable
                        onPress={addItem}
                        style={({ pressed }) => [
                          styles.itemActionBtnAdd,
                          pressed && styles.itemActionBtnPressed
                        ]}
                      >
                        <MaterialIcons name="add" size={24} color={theme.colors.onPrimary} />
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {/* Buttons Area */}
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
                  <Text style={styles.saveButtonText}>Simpan Pengeluaran</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => navigation.goBack()}
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
                  if (activeItemIndex !== null) {
                    updateItemKategori(activeItemIndex, cat.id);
                  }
                  setCategoryModalVisible(false);
                }}
                style={[
                  styles.modalOption,
                  activeItemIndex !== null && items[activeItemIndex]?.kategori === cat.id && styles.modalOptionSelected,
                ]}
              >
                <MaterialIcons
                  name={cat.icon}
                  size={24}
                  color={
                    activeItemIndex !== null && items[activeItemIndex]?.kategori === cat.id
                      ? theme.colors.primary
                      : theme.colors.onSurface
                  }
                  style={styles.modalOptionIcon}
                />
                <Text style={[
                  styles.modalOptionText,
                  activeItemIndex !== null && items[activeItemIndex]?.kategori === cat.id && styles.modalOptionTextSelected,
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

      {/* Cycle Selection Modal */}
      <Modal
        visible={cycleModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCycleModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCycleModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Siklus Tanam</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Pressable
                onPress={() => {
                  if (activeItemIndex !== null) {
                    updateItemSiklus(activeItemIndex, 'new');
                  }
                  setCycleModalVisible(false);
                }}
                style={[
                  styles.modalOption,
                  activeItemIndex !== null && items[activeItemIndex]?.siklusId === 'new' && styles.modalOptionSelected,
                ]}
              >
                <MaterialIcons name="add" size={24} color={theme.colors.primary} style={styles.modalOptionIcon} />
                <Text style={[
                  styles.modalOptionText,
                  activeItemIndex !== null && items[activeItemIndex]?.siklusId === 'new' && styles.modalOptionTextSelected,
                ]}>
                  [+] Buat Siklus Baru
                </Text>
              </Pressable>

              {activeCycles.map((cycle) => (
                <Pressable
                  key={cycle.id}
                  onPress={() => {
                    if (activeItemIndex !== null) {
                      updateItemSiklus(activeItemIndex, cycle.id);
                    }
                    setCycleModalVisible(false);
                  }}
                  style={[
                    styles.modalOption,
                    activeItemIndex !== null && items[activeItemIndex]?.siklusId === cycle.id && styles.modalOptionSelected,
                  ]}
                >
                  <MaterialIcons name="sync" size={24} color={theme.colors.primary} style={styles.modalOptionIcon} />
                  <Text style={[
                    styles.modalOptionText,
                    activeItemIndex !== null && items[activeItemIndex]?.siklusId === cycle.id && styles.modalOptionTextSelected,
                  ]}>
                    {cycle.name} ({cycle.crop})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              onPress={() => setCycleModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseButtonText}>Batal</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

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

            {standardCrops.map((crop) => (
              <Pressable
                key={crop.id}
                onPress={() => {
                  if (activeItemIndex !== null) {
                    updateItemKomoditas(activeItemIndex, crop.id);
                  }
                  setCropModalVisible(false);
                }}
                style={[
                  styles.modalOption,
                  activeItemIndex !== null && items[activeItemIndex]?.newCycleCrop === crop.id && styles.modalOptionSelected,
                ]}
              >
                <Text style={styles.modalOptionIcon}>{crop.emoji}</Text>
                <Text style={[
                  styles.modalOptionText,
                  activeItemIndex !== null && items[activeItemIndex]?.newCycleCrop === crop.id && styles.modalOptionTextSelected,
                ]}>
                  {crop.label}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={() => setCropModalVisible(false)}
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  dateCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.containerPadding,
    marginBottom: theme.spacing.stackSpace,
  },
  formCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.containerPadding,
    marginBottom: theme.spacing.stackSpace,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
    paddingBottom: 8,
  },
  itemTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  deleteHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
  },
  deleteHeaderText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.error,
  },
  nominalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  nominalInputWrapper: {
    flex: 1,
  },
  actionButtonsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
    height: 48,
    marginBottom: 0,
  },
  itemActionBtnAdd: {
    width: 48,
    height: 48,
    borderRadius: theme.rounded.lg,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemActionBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  buttonContainer: {
    gap: 12,
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
  disabledButton: {
    opacity: 0.7,
  },
  spinner: {
    marginRight: 10,
  },
  saveButtonText: {
    ...theme.typography.buttonText,
    color: theme.colors.onPrimary,
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

export default TambahCatatanScreen;
