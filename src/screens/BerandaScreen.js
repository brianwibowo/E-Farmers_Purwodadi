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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { theme } from '../theme';
import { useAuth } from '../utils/AuthContext';
import { getExpenses, getPanen, savePanen } from '../utils/storage';
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

export const BerandaScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [panen, setPanen] = useState({ komoditas: '', estimasi_hasil_kg: '', harga_jual_per_kg: '' });
  
  // Calculator inputs
  const [komoditas, setKomoditas] = useState('');
  const [hasilPanen, setHasilPanen] = useState('');
  const [hargaJual, setHargaJual] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [calculatorResult, setCalculatorResult] = useState(0);

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
    const loadedPanen = await getPanen();
    setExpenses(loadedExpenses);
    setPanen(loadedPanen);
  };

  // Reload when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Filter expenses for current month and year
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const currentMonthExpenses = expenses.filter((exp) => {
    if (!exp.tanggal) return false;
    const [y, m] = exp.tanggal.split('-').map(Number);
    return m - 1 === currentMonth && y === currentYear;
  });

  // Calculate overall figures based on current month
  const totalPengeluaran = calculateTotalPengeluaran(currentMonthExpenses);
  const estimasiPendapatan = calculateEstimasiPendapatan(panen);
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

  // Handle calculator submission
  const handleCalculate = async () => {
    if (!komoditas.trim()) {
      alert('Mohon masukkan nama komoditas.');
      return;
    }

    const hasil = parseFloat(hasilPanen) || 0;
    const harga = parseNominalInput(hargaJual) || 0;

    if (hasil <= 0 || harga <= 0) {
      alert('Mohon masukkan jumlah panen dan harga jual yang valid.');
      return;
    }

    const newPanen = {
      komoditas: komoditas.trim(),
      estimasi_hasil_kg: hasil,
      harga_jual_per_kg: harga,
    };

    await savePanen(newPanen);
    setPanen(newPanen);
    
    const calculatedRevenue = hasil * harga;
    setCalculatorResult(calculatedRevenue);
    setShowResult(true);
  };

  const handleReset = () => {
    setKomoditas('');
    setHasilPanen('');
    setHargaJual('');
    setShowResult(false);
    setCalculatorResult(0);
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
            <MaterialIcons name="agriculture" size={28} color={theme.colors.primary} />
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
            <Text style={styles.headerText}>E-Farmers</Text>
          </View>
        </View>
        <View style={styles.headerRightContainer}>
          <Pressable 
            onPress={() => setTourVisible(true)}
            style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
          >
            <MaterialIcons name="help-outline" size={24} color={theme.colors.primary} />
          </Pressable>
          <Pressable 
            ref={profileRef}
            onPress={() => navigation.navigate('Profile')}
            style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
          >
            {user?.photoUri ? (
              <Image source={{ uri: user.photoUri }} style={styles.headerAvatar} />
            ) : (
              <MaterialIcons name="person" size={24} color={theme.colors.onSurfaceVariant} />
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView 
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Bento Grid Summary Section */}
        <View ref={insightRef} style={styles.gridSection}>
          {/* Total Pengeluaran (Full Width) */}
          <View style={styles.rowFull}>
            <SummaryCard
              label="Total Pengeluaran"
              subLabel={`(${MONTH_NAMES[currentMonth]} ${currentYear})`}
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
              subLabel={`(${MONTH_NAMES[currentMonth]} ${currentYear})`}
              value={formatRupiah(estimasiPendapatan)}
              icon="trending-up"
              iconColor={theme.colors.secondary}
            />
            <View style={styles.gap} />
            <SummaryCard
              label="Est. Untung/Rugi"
              subLabel={`(${MONTH_NAMES[currentMonth]} ${currentYear})`}
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

        {/* Harvest Calculator Section */}
        <View ref={calculatorRef} style={styles.calculatorCard}>
          <View style={styles.calculatorHeader}>
            <View style={styles.calculatorIconBadge}>
              <MaterialIcons name="calculate" size={24} color={theme.colors.onPrimary} />
            </View>
            <Text style={styles.calculatorTitle}>Kalkulator Panen</Text>
          </View>
          <Text style={styles.calculatorDesc}>Hitung estimasi pendapatan berdasarkan hasil panen dan harga jual.</Text>
          
          <InputField
            label="Komoditas"
            placeholder="Contoh: Padi"
            value={komoditas}
            onChangeText={(text) => {
              if (text.length > 0) {
                setKomoditas(text.charAt(0).toUpperCase() + text.slice(1));
              } else {
                setKomoditas('');
              }
            }}
            icon="grass"
            autoCapitalize="sentences"
          />

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
              <MaterialIcons name="calculate" size={24} color={theme.colors.onPrimary} />
              <Text style={styles.calcButtonText}>Hitung Sekarang</Text>
            </Pressable>
            {showResult ? (
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

          {showResult ? (
            <View style={styles.resultDisplay}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Komoditas</Text>
                <Text style={styles.resultValueText}>{panen.komoditas || komoditas}</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Hasil Panen</Text>
                <Text style={styles.resultValueText}>{parseFloat(hasilPanen).toLocaleString('id-ID')} Kg</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Harga Jual</Text>
                <Text style={styles.resultValueText}>{formatRupiah(parseNominalInput(hargaJual))} / Kg</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Estimasi Pendapatan</Text>
                <Text style={styles.resultValue}>{formatRupiah(calculatorResult)}</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Total Pengeluaran</Text>
                <Text style={[styles.resultValue, { color: theme.colors.error }]}>{formatRupiah(totalPengeluaran)}</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Estimasi Keuntungan</Text>
                <Text style={[styles.resultValue, { color: (calculatorResult - totalPengeluaran) >= 0 ? theme.colors.secondary : theme.colors.error }]}>
                  {formatRupiah(calculatorResult - totalPengeluaran)}
                </Text>
              </View>
              <View style={styles.resultDivider} />
              {(() => {
                const calcPercentage = calculatePersentase(calculatorResult - totalPengeluaran, calculatorResult);
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

        {/* Banner Illustration */}
        <View style={styles.bannerContainer}>
          <ImageBackground
            source={require('../../assets/rice_field.png')}
            style={styles.bannerImage}
            imageStyle={styles.bannerImageRound}
          >
            <View style={styles.bannerOverlay}>
              <Text style={styles.bannerText}>
                Pantau terus perkembangan lahan Anda bersama E-Farmers.
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
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.containerPadding,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.8)',
    elevation: 6,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(1, 45, 29, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(1, 45, 29, 0.1)',
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
    color: theme.colors.onSurfaceVariant,
    lineHeight: 16,
    marginBottom: 2,
    fontWeight: '500',
  },
  headerText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
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
    backgroundColor: 'rgba(1, 45, 29, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(1, 45, 29, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonPressed: {
    backgroundColor: 'rgba(1, 45, 29, 0.12)',
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
});

export default BerandaScreen;
