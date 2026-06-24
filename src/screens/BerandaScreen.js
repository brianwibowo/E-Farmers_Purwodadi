import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Pressable,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { theme } from '../theme';
import { useAuth } from '../utils/AuthContext';
import { getExpenses, getCycles, updateCycleHarvest, archiveCycleBySiklus } from '../utils/storage';
import FeatureTour from '../components/FeatureTour';
import {
  calculateTotalPengeluaran,
  calculateEstimasiPendapatan,
  calculateUntungRugi,
  calculatePersentase,
  formatRupiah,
} from '../utils/calculations';
import SummaryCard from '../components/SummaryCard';
import InputField from '../components/InputField';
import { formatNominalInput, parseNominalInput } from '../utils/formatNominal';
import { standardCrops, getCropEmoji, getCropColor } from '../utils/crops';

export const BerandaScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [activeCycles, setActiveCycles] = useState([]);
  const [activeCycleId, setActiveCycleId] = useState('Semua');
  
  // Calculator inputs
  const [hasilPanen, setHasilPanen] = useState('');
  const [hargaJual, setHargaJual] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [calculatorResult, setCalculatorResult] = useState(0);
  const [isArchiving, setIsArchiving] = useState(false);

  // Tour Refs & State
  const scrollRef = useRef(null);
  const profileRef = useRef(null);
  const insightRef = useRef(null);
  const calculatorRef = useRef(null);
  const [tourVisible, setTourVisible] = useState(false);

  useEffect(() => {
    const checkTour = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem('HAS_SEEN_BERANDA_TOUR');
        if (hasSeen !== 'true') {
          setTimeout(() => {
            setTourVisible(true);
          }, 800);
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkTour();
  }, []);

  const handleFinishTour = async () => {
    try {
      await AsyncStorage.setItem('HAS_SEEN_BERANDA_TOUR', 'true');
      setTourVisible(false);
    } catch (err) {
      console.error(err);
      setTourVisible(false);
    }
  };

  const tourSteps = [
    {
      title: 'Profil Pengguna',
      description: 'Di sini Anda dapat mengakses profil Anda, mengganti foto profil, mengedit nama pengguna, atau memperbarui nomor HP Anda.',
      ref: profileRef,
      onBeforeShow: () => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    },
    {
      title: 'Ringkasan Kas & Analisis Margin',
      description: 'Di sini Anda dapat memantau total pengeluaran, estimasi pendapatan, serta sisa untung/rugi bulan ini. Lingkaran di bawah juga menganalisis persentase margin keuntungan Anda secara visual.',
      ref: insightRef,
      popoverPosition: 'bottom', // Force position to safe lower-middle screen area
      onBeforeShow: () => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    },
    {
      title: 'Kalkulator Panen',
      description: 'Gunakan kalkulator pertanian ini untuk memperkirakan pendapatan kotor Anda sebelum menyimpannya ke dalam sistem.',
      ref: calculatorRef,
      onBeforeShow: () => {
        scrollRef.current?.scrollTo({ y: 220, animated: true });
      }
    },
  ];

  // Load data from AsyncStorage
  const loadData = async () => {
    const loadedExpenses = await getExpenses();
    const loadedCycles = await getCycles();
    setExpenses(loadedExpenses);
    setCycles(loadedCycles);
    
    const active = loadedCycles.filter(c => c.status === 'active');
    setActiveCycles(active);
  };

  // Reload when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Filter pengeluaran yang aktif (belum diarsip/tutup buku)
  const activeExpenses = expenses.filter(exp => !exp.is_archived);

  // Filter pengeluaran berdasarkan siklus yang dipilih
  const filteredExpenses = activeCycleId === 'Semua'
    ? activeExpenses
    : activeExpenses.filter(exp => exp.siklusId === activeCycleId);

  // Hitung total pengeluaran aktif
  const totalPengeluaran = calculateTotalPengeluaran(filteredExpenses);

  // Hitung estimasi pendapatan aktif
  const estimasiPendapatan = activeCycleId === 'Semua'
    ? activeCycles.reduce((sum, c) => {
        const hasil = parseFloat(c.harvestResult) || 0;
        const harga = parseFloat(c.harvestPrice) || 0;
        return sum + (hasil * harga);
      }, 0)
    : (() => {
        const c = activeCycles.find(cyc => cyc.id === activeCycleId);
        if (!c) return 0;
        const hasil = parseFloat(c.harvestResult) || 0;
        const harga = parseFloat(c.harvestPrice) || 0;
        return hasil * harga;
      })();

  const estimasiUntung = calculateUntungRugi(estimasiPendapatan, totalPengeluaran);
  const persentaseKeuntungan = calculatePersentase(estimasiUntung, estimasiPendapatan);

  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentValue = Math.max(0, Math.min(100, persentaseKeuntungan));
  const strokeDashoffset = circumference - (percentValue / 100) * circumference;

  const getInsightData = (percent) => {
    if (percent >= 50) {
      return {
        title: 'Keuntungan Sangat Baik!',
        desc: 'Hasil panen periode ini menunjukkan tren positif di atas rata-rata.',
      };
    } else if (percent >= 10) {
      return {
        title: 'Keuntungan Stabil',
        desc: 'Usaha tani berjalan dengan sehat, hasil panen stabil menutup biaya operasional.',
      };
    } else if (percent >= 0) {
      return {
        title: 'Margin Sangat Tipis',
        desc: 'Keuntungan sangat rendah. Disarankan untuk menekan biaya operasional.',
      };
    } else {
      return {
        title: 'Potensi Kerugian',
        desc: 'Biaya operasional melampaui estimasi hasil. Disarankan evaluasi anggaran.',
      };
    }
  };

  const insight = getInsightData(persentaseKeuntungan);

  // Memilih siklus filter
  const handleSelectCycle = (cycleId) => {
    setActiveCycleId(cycleId);
    setShowResult(false);
    if (cycleId === 'Semua') {
      setHasilPanen('');
      setHargaJual('');
    } else {
      const cycle = activeCycles.find(c => c.id === cycleId);
      if (cycle) {
        setHasilPanen(cycle.harvestResult ? cycle.harvestResult.toString() : '');
        setHargaJual(cycle.harvestPrice ? formatNominalInput(cycle.harvestPrice.toString()) : '');
      }
    }
  };

  // Handle calculator submission
  const handleCalculate = async () => {
    if (activeCycleId === 'Semua') {
      Alert.alert('Info', 'Silakan pilih salah satu siklus tanam terlebih dahulu.');
      return;
    }

    const hasil = parseFloat(hasilPanen) || 0;
    const harga = parseNominalInput(hargaJual) || 0;

    if (hasil <= 0 || harga <= 0) {
      Alert.alert('Info', 'Mohon masukkan jumlah panen dan harga jual yang valid.');
      return;
    }

    await updateCycleHarvest(activeCycleId, hasil, harga);
    
    // Refresh data
    await loadData();
    
    const calculatedRevenue = hasil * harga;
    setCalculatorResult(calculatedRevenue);
    setShowResult(true);
    Alert.alert('Sukses', 'Estimasi hasil panen berhasil diperbarui!');
  };

  const handleReset = async () => {
    if (activeCycleId === 'Semua') return;
    await updateCycleHarvest(activeCycleId, 0, 0);
    await loadData();
    setHasilPanen('');
    setHargaJual('');
    setShowResult(false);
    setCalculatorResult(0);
  };

  const handleArchiveCycle = () => {
    if (activeCycleId === 'Semua') return;
    const cycle = activeCycles.find(c => c.id === activeCycleId);
    if (!cycle) return;

    Alert.alert(
      'Selesaikan Masa Tanam',
      `Apakah Anda yakin ingin menyelesaikan masa tanam untuk siklus "${cycle.name}"?\n\nSemua pengeluaran aktif dalam siklus ini akan diarsipkan, dan siklus ini akan dipindahkan ke riwayat pengarsipan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Selesaikan & Tutup Buku',
          style: 'destructive',
          onPress: async () => {
            setIsArchiving(true);
            try {
              await archiveCycleBySiklus(activeCycleId);
              Alert.alert('Sukses', `Masa tanam untuk "${cycle.name}" berhasil diselesaikan!\nLaporan siklus telah disimpan ke arsip.`);
              await loadData();
              setActiveCycleId('Semua');
              setShowResult(false);
            } catch (err) {
              Alert.alert('Gagal', err.message || 'Gagal mengarsipkan siklus.');
              console.error(err);
            } finally {
              setIsArchiving(false);
            }
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}
    >
      {/* Premium Custom White Header with Rounded Bottom */}
      <View style={[styles.header, { height: 88 + insets.top, paddingTop: insets.top }]}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerIconBadge}>
            <MaterialIcons name="agriculture" size={28} color="#cbffc2" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerSubtitle}>{(() => {
              const date = new Date();
              const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
              const hour = new Date(utc + (3600000 * 7)).getHours(); // WIB (Jakarta) is UTC+7
              const username = user?.username || 'Pak Tani';
              if (hour >= 4 && hour < 11) return `Selamat Pagi, ${username}!`;
              if (hour >= 11 && hour < 15) return `Selamat Siang, ${username}!`;
              if (hour >= 15 && hour < 18) return `Selamat Sore, ${username}!`;
              return `Selamat Malam, ${username}!`;
            })()}</Text>
            <Text style={styles.headerText}>WicakTani</Text>
          </View>
        </View>
        <View style={styles.headerRightContainer}>
          <Pressable 
            onPress={() => setTourVisible(true)}
            style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
          >
            <MaterialIcons name="help-outline" size={24} color="#ffffff" />
          </Pressable>
          <Pressable 
            ref={profileRef}
            onPress={() => navigation.navigate('Profile')}
            style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
          >
            <MaterialIcons name="settings" size={24} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <ScrollView 
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Horizontal Cycle Filter Bar */}
        {(() => {
          const cycleOptions = [{ id: 'Semua', name: 'Semua', crop: '' }, ...activeCycles];
          
          return (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterScrollContent}
            >
              {cycleOptions.map((cycle) => {
                const isSelected = activeCycleId === cycle.id;
                const emoji = cycle.id === 'Semua' ? '📊' : getCropEmoji(cycle.crop);
                return (
                  <Pressable
                    key={cycle.id}
                    onPress={() => handleSelectCycle(cycle.id)}
                    style={[
                      styles.filterPill,
                      isSelected && styles.filterPillSelected
                    ]}
                  >
                    <Text style={styles.filterPillEmoji}>{emoji}</Text>
                    <Text style={[styles.filterPillText, isSelected && styles.filterPillTextSelected]}>
                      {cycle.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          );
        })()}

        {/* Bento Grid Summary Section */}
        <View ref={insightRef} style={styles.gridSection}>
          {/* Total Pengeluaran (Full Width) */}
          <View style={styles.rowFull}>
            <SummaryCard
              label="Total Pengeluaran"
              subLabel={activeCycleId === 'Semua' ? '(Akumulasi Aktif)' : `(Siklus: ${activeCycles.find(c => c.id === activeCycleId)?.name || ''})`}
              value={formatRupiah(totalPengeluaran)}
              icon="payments"
              iconColor={theme.colors.primary}
              fullWidth={true}
            />
          </View>

          {/* Half Width Row */}
          <View style={styles.rowHalf}>
            <SummaryCard
              label="Est. Pendapatan"
              subLabel={activeCycleId === 'Semua' ? '(Akumulasi Aktif)' : `(Siklus: ${activeCycles.find(c => c.id === activeCycleId)?.name || ''})`}
              value={formatRupiah(estimasiPendapatan)}
              icon="trending-up"
              iconColor={theme.colors.secondary}
            />
            <View style={styles.gap} />
            <SummaryCard
              label="Est. Untung/Rugi"
              subLabel={activeCycleId === 'Semua' ? '(Akumulasi Aktif)' : `(Siklus: ${activeCycles.find(c => c.id === activeCycleId)?.name || ''})`}
              value={formatRupiah(estimasiUntung)}
              icon="account-balance-wallet"
              iconColor={estimasiUntung >= 0 ? theme.colors.secondary : theme.colors.error}
            />
          </View>

          {/* Persentase Keuntungan (Custom Premium Insight Card) */}
          <View style={styles.rowFull}>
            <View style={styles.insightCard}>
              <View style={styles.scoreCircleContainer}>
                <Svg width={size} height={size}>
                  <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={theme.colors.onPrimaryContainer}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    rotation={-90}
                    originX={size / 2}
                    originY={size / 2}
                  />
                </Svg>
                <View style={styles.scoreTextOverlay}>
                  <Text style={styles.scoreLabel}>Skor</Text>
                  <Text style={styles.scoreText}>{percentValue.toFixed(0)}%</Text>
                </View>
              </View>
              <View style={styles.insightTextContainer}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDesc}>{insight.desc}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Breakdown list for "Semua" filter */}
        {activeCycleId === 'Semua' && (
          <View style={styles.cropsListSection}>
            <Text style={styles.sectionTitle}>Ringkasan Lahan Aktif</Text>
            {(() => {
              if (activeCycles.length === 0) {
                return (
                  <View style={styles.emptyCropsCard}>
                    <MaterialIcons name="eco" size={44} color={theme.colors.outline} />
                    <Text style={styles.emptyCropsText}>Belum ada siklus tanam yang aktif.</Text>
                    <Text style={styles.emptyCropsSubtext}>
                      Mulai catat pengeluaran pertama Anda untuk membuat siklus tanam baru.
                    </Text>
                    <Pressable
                      onPress={() => navigation.navigate('TambahCatatan')}
                      style={({ pressed }) => [
                        styles.emptyStateButton,
                        pressed && styles.pressed
                      ]}
                    >
                      <Text style={styles.emptyStateButtonText}>Mulai Siklus Baru</Text>
                    </Pressable>
                  </View>
                );
              }

              return activeCycles.map((cycle) => {
                const cycleExpenses = activeExpenses.filter(e => e.siklusId === cycle.id);
                const cycleTotalExpense = calculateTotalPengeluaran(cycleExpenses);
                
                const cycleRevenue = (parseFloat(cycle.harvestResult) || 0) * (parseFloat(cycle.harvestPrice) || 0);
                const cycleProfit = cycleRevenue - cycleTotalExpense;
                
                const cropColor = getCropColor(cycle.crop);
                const cropEmoji = getCropEmoji(cycle.crop);

                return (
                  <Pressable
                    key={cycle.id}
                    onPress={() => handleSelectCycle(cycle.id)}
                    style={({ pressed }) => [
                      styles.cropBreakdownCard,
                      pressed && styles.cropBreakdownCardPressed
                    ]}
                  >
                    <View style={styles.cropBreakdownHeader}>
                      <View style={[styles.cropEmojiCircle, { backgroundColor: `${cropColor}15` }]}>
                        <Text style={styles.cropEmojiText}>{cropEmoji}</Text>
                      </View>
                      <View style={styles.cropNameContainer}>
                        <Text style={styles.cropBreakdownName}>{cycle.name}</Text>
                        <Text style={styles.cropBreakdownStatus}>Masa Tanam: {cycle.startDate}</Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
                    </View>

                    <View style={styles.cropBreakdownDivider} />

                    <View style={styles.cropBreakdownBody}>
                      <View style={styles.cropBreakdownRow}>
                        <Text style={styles.cropBreakdownLabel}>Total Pengeluaran</Text>
                        <Text style={[styles.cropBreakdownValue, { color: theme.colors.error }]}>
                          {formatRupiah(cycleTotalExpense)}
                        </Text>
                      </View>
                      <View style={styles.cropBreakdownRow}>
                        <Text style={styles.cropBreakdownLabel}>Est. Pendapatan</Text>
                        <Text style={styles.cropBreakdownValue}>
                          {formatRupiah(cycleRevenue)}
                        </Text>
                      </View>
                      <View style={styles.cropBreakdownRow}>
                        <Text style={styles.cropBreakdownLabel}>Est. Untung/Rugi</Text>
                        <Text style={[
                          styles.cropBreakdownValue, 
                          { color: cycleProfit >= 0 ? theme.colors.secondary : theme.colors.error }
                        ]}>
                          {formatRupiah(cycleProfit)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              });
            })()}
          </View>
        )}

        {/* Harvest Calculator Section (only shown when specific cycle is selected) */}
        {activeCycleId !== 'Semua' && (() => {
          const selectedCycle = activeCycles.find(c => c.id === activeCycleId);
          if (!selectedCycle) return null;

          return (
            <View ref={calculatorRef} style={styles.calculatorCard}>
              <View style={styles.calculatorHeader}>
                <View style={styles.calculatorIconBadge}>
                  <MaterialIcons name="calculate" size={24} color={theme.colors.onPrimary} />
                </View>
                <Text style={styles.calculatorTitle}>Kalkulator Panen ({selectedCycle.name})</Text>
              </View>
              <Text style={styles.calculatorDesc}>Hitung dan simpan estimasi hasil panen untuk siklus "{selectedCycle.name}".</Text>
              
              <InputField
                label="Estimasi Hasil Panen (Kg)"
                placeholder="Contoh: 1000"
                value={hasilPanen}
                onChangeText={setHasilPanen}
                keyboardType="numeric"
                icon="eco"
              />
              
              <InputField
                label="Harga Jual per Kg (Rp)"
                placeholder="Contoh: 5.000"
                value={hargaJual}
                onChangeText={(text) => setHargaJual(formatNominalInput(text))}
                keyboardType="numeric"
                icon="sell"
              />

              <View style={styles.calcButtonsContainer}>
                <Pressable
                  onPress={handleCalculate}
                  style={({ pressed }) => [
                    styles.calcButton,
                    pressed && styles.calcButtonPressed
                  ]}
                >
                  <MaterialIcons name="save" size={22} color={theme.colors.onPrimary} />
                  <Text style={styles.calcButtonText}>Hitung & Simpan</Text>
                </Pressable>
                {(showResult || (selectedCycle.harvestResult > 0)) ? (
                  <Pressable
                    onPress={handleReset}
                    style={({ pressed }) => [
                      styles.resetButton,
                      pressed && styles.resetButtonPressed
                    ]}
                  >
                    <MaterialIcons name="refresh" size={24} color={theme.colors.onSurfaceVariant} />
                    <Text style={styles.resetButtonText}>Reset</Text>
                  </Pressable>
                ) : null}
              </View>

              {(showResult || (selectedCycle.harvestResult > 0)) ? (
                <View style={styles.resultDisplay}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Siklus Tanam</Text>
                    <Text style={styles.resultValueText}>{selectedCycle.name} ({selectedCycle.crop})</Text>
                  </View>
                  <View style={styles.resultDivider} />
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Hasil Panen</Text>
                    <Text style={styles.resultValueText}>
                      {parseFloat(hasilPanen || selectedCycle.harvestResult || 0).toLocaleString('id-ID')} Kg
                    </Text>
                  </View>
                  <View style={styles.resultDivider} />
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Harga Jual</Text>
                    <Text style={styles.resultValueText}>
                      {formatRupiah(parseNominalInput(hargaJual) || selectedCycle.harvestPrice || 0)} / Kg
                    </Text>
                  </View>
                  <View style={styles.resultDivider} />
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Estimasi Pendapatan</Text>
                    <Text style={styles.resultValue}>{formatRupiah(estimasiPendapatan)}</Text>
                  </View>
                  <View style={styles.resultDivider} />
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Total Pengeluaran</Text>
                    <Text style={[styles.resultValue, { color: theme.colors.error }]}>{formatRupiah(totalPengeluaran)}</Text>
                  </View>
                  <View style={styles.resultDivider} />
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Estimasi Keuntungan</Text>
                    <Text style={[styles.resultValue, { color: estimasiUntung >= 0 ? theme.colors.secondary : theme.colors.error }]}>
                      {formatRupiah(estimasiUntung)}
                    </Text>
                  </View>
                  <View style={styles.resultDivider} />
                  {(() => {
                    const calcPercentage = calculatePersentase(estimasiUntung, estimasiPendapatan);
                    const calcInsight = getInsightData(calcPercentage);
                    return (
                      <View style={styles.insightTextRow}>
                        <MaterialIcons name="insights" size={20} color={theme.colors.secondary} style={styles.insightIcon} />
                        <View style={styles.insightTextContent}>
                          <Text style={styles.calcInsightTitle}>{calcInsight.title}</Text>
                          <Text style={styles.calcInsightDesc}>{calcInsight.desc}</Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>
              ) : null}
            </View>
          );
        })()}

        {/* Tutup Buku Button */}
        {activeCycleId !== 'Semua' && (() => {
          const selectedCycle = activeCycles.find(c => c.id === activeCycleId);
          if (!selectedCycle) return null;
          
          if (totalPengeluaran > 0 || selectedCycle.harvestResult > 0) {
            return (
              <Pressable
                onPress={handleArchiveCycle}
                disabled={isArchiving}
                style={({ pressed }) => [
                  styles.archiveButton,
                  pressed && styles.archiveButtonPressed,
                  isArchiving && styles.disabledButton,
                ]}
              >
                {isArchiving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="done-all" size={24} color="#ffffff" />
                    <Text style={styles.archiveButtonText}>Selesaikan Masa Tanam</Text>
                  </>
                )}
              </Pressable>
            );
          }
          return null;
        })()}

        {/* Banner Illustration */}
        <View style={styles.bannerContainer}>
          <ImageBackground
            source={require('../../assets/rice_field.png')}
            style={styles.bannerImage}
            imageStyle={styles.bannerImageRound}
          >
            <View style={styles.bannerOverlay}>
              <Text style={styles.bannerText}>
                Pantau terus perkembangan lahan Anda bersama WicakTani.
              </Text>
            </View>
          </ImageBackground>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pengembang: Tim Pengabdian DPPM UNNES 2026
          </Text>
        </View>
        </ScrollView>
        <FeatureTour
          visible={tourVisible}
          steps={tourSteps}
          onFinish={handleFinishTour}
          onClose={handleFinishTour}
        />
      </KeyboardAvoidingView>
    );
  };

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  // Premium Custom White Header with Rounded Bottom
  header: {
    backgroundColor: '#012d1d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.containerPadding,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontFamily: 'PublicSans-Medium',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 16,
    marginBottom: 2,
    fontWeight: '500',
  },
  headerText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 20,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: 'rgba(1, 45, 29, 0.1)',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.marginMobile,
    paddingTop: 20,
    paddingBottom: 110,
  },
  // Welcome Section
  welcomeContainer: {
    marginBottom: 20,
  },
  welcomeText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.onSurface,
    lineHeight: 30,
  },
  welcomeSubtext: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 22,
  },
  // Grid Section
  gridSection: {
    marginBottom: 12,
  },
  rowFull: {
    marginBottom: 12,
  },
  rowHalf: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  gap: {
    width: 12,
  },
  // Calculator Section
  calculatorCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.containerPadding,
    marginBottom: theme.spacing.stackSpace,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  calculatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  calculatorIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  calculatorTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  calculatorDesc: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 20,
  },
  calcButton: {
    flex: 2,
    flexDirection: 'row',
    height: theme.spacing.touchTargetMin,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  calcButtonPressed: {
    backgroundColor: theme.colors.primaryContainer,
    transform: [{ scale: 0.98 }],
  },
  calcButtonText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onPrimary,
    marginLeft: 6,
  },
  resultDisplay: {
    marginTop: 20,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.rounded.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  resultDivider: {
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
    marginHorizontal: 16,
  },
  resultLabel: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  resultValue: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  resultValueText: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 16,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  calcButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    height: theme.spacing.touchTargetMin,
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonPressed: {
    backgroundColor: theme.colors.surfaceContainerHighest,
    transform: [{ scale: 0.98 }],
  },
  resetButtonText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
    marginLeft: 4,
  },
  insightTextRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(14, 108, 74, 0.05)',
    alignItems: 'flex-start',
  },
  insightIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  insightTextContent: {
    flex: 1,
  },
  calcInsightTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.secondary,
    marginBottom: 2,
  },
  calcInsightDesc: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 16,
  },
  // Banner Section
  bannerContainer: {
    width: '100%',
    height: 180,
    borderRadius: theme.rounded.xl,
    overflow: 'hidden',
    marginBottom: theme.spacing.stackSpace,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerImageRound: {
    borderRadius: theme.rounded.xl,
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 45, 29, 0.55)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  bannerText: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    lineHeight: 24,
  },
  // Custom Insight Card Styles
  insightCard: {
    backgroundColor: '#23752c', // Matches exact green color in user screenshot
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  scoreCircleContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 16,
  },
  scoreTextOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreLabel: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 11,
    color: '#ffffff',
    textTransform: 'capitalize',
    lineHeight: 14,
    fontWeight: '700',
  },
  scoreText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '800',
    lineHeight: 24,
  },
  insightTextContainer: {
    flex: 1,
  },
  insightTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    lineHeight: 24,
  },
  insightDesc: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 14,
    color: '#e2f0d9', // Light pastel green for high contrast description
    lineHeight: 20,
  },
  // Footer Section
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  footerLogo: {
    width: 48,
    height: 48,
    marginBottom: 12,
    opacity: 0.6,
  },
  footerText: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    fontWeight: '400',
    opacity: 0.6,
  },
  // Crop Filter styles
  filterScroll: {
    marginBottom: 16,
    flexGrow: 0,
  },
  filterScrollContent: {
    paddingRight: 16,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    marginRight: 8,
  },
  filterPillSelected: {
    backgroundColor: '#012d1d',
    borderColor: '#012d1d',
  },
  filterPillEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  filterPillText: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 14,
    color: '#40493d',
    fontWeight: '600',
  },
  filterPillTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  
  // Crop Breakdown Card styles
  cropsListSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#012d1d',
    marginBottom: 12,
  },
  cropBreakdownCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cropBreakdownCardPressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: '#f5fced',
  },
  cropBreakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropEmojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cropEmojiText: {
    fontSize: 20,
  },
  cropNameContainer: {
    flex: 1,
  },
  cropBreakdownName: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#171d14',
  },
  cropBreakdownStatus: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 12,
    color: '#707a6c',
  },
  cropBreakdownDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 12,
  },
  cropBreakdownBody: {
    gap: 8,
  },
  cropBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cropBreakdownLabel: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 13,
    color: '#707a6c',
  },
  cropBreakdownValue: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: '#171d14',
  },
  
  // Empty crops card
  emptyCropsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyCropsText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#171d14',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyCropsSubtext: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 13,
    color: '#707a6c',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  emptyStateButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.rounded.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  emptyStateButtonText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  
  // Archive Button styles
  archiveButton: {
    flexDirection: 'row',
    height: theme.spacing.touchTargetMin,
    backgroundColor: '#ba1a1a',
    borderRadius: theme.rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.stackSpace,
    elevation: 2,
    shadowColor: '#ba1a1a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  archiveButtonPressed: {
    backgroundColor: '#93000a',
    transform: [{ scale: 0.98 }],
  },
  archiveButtonText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 8,
  },
});

export default BerandaScreen;
