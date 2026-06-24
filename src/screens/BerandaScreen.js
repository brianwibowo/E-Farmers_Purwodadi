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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Svg, { Circle, Rect, Text as SvgText, Line, G } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { theme } from '../theme';
import { useAuth } from '../utils/AuthContext';
import {
  getExpenses,
  getCycles,
  updateCycleHarvest,
  archiveCycleBySiklus,
  createCycle,
  addExpense,
  deleteCycleAndExpenses,
  updateCycleInfo,
} from '../utils/storage';
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
import { categories, getCategoryById } from '../utils/categories';

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLast5Months = () => {
  const months = [];
  const now = new Date();
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthIndex = d.getMonth();
    const year = d.getFullYear();
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const label = MONTH_NAMES_SHORT[monthIndex] + ` '${String(year).slice(-2)}`;
    months.push({ key, label, amount: 0 });
  }
  return months;
};

const getMonthlyChartData = (expensesList) => {
  const last5 = getLast5Months();
  expensesList.forEach(exp => {
    if (!exp.tanggal) return;
    const [y, m] = exp.tanggal.split('-');
    const expKey = `${y}-${m}`;
    const matched = last5.find(m => m.key === expKey);
    if (matched) {
      matched.amount += (exp.nominal || 0);
    }
  });
  return last5;
};

const getDynamicTrendExplanation = (expensesList) => {
  if (!expensesList || expensesList.length === 0) {
    return ['Belum ada catatan pengeluaran dalam sistem. Mulai tambahkan tanaman baru untuk melacak pengeluaran Anda!'];
  }

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  let thisMonthTotal = 0;
  let lastMonthTotal = 0;

  const monthlySums = {};

  expensesList.forEach(exp => {
    if (!exp.tanggal || !exp.nominal) return;
    const [y, m] = exp.tanggal.split('-');
    const key = `${y}-${m}`;

    monthlySums[key] = (monthlySums[key] || 0) + exp.nominal;

    if (key === thisMonthKey) {
      thisMonthTotal += exp.nominal;
    } else if (key === lastMonthKey) {
      lastMonthTotal += exp.nominal;
    }
  });

  const bulletPoints = [];

  if (thisMonthTotal > 0 && lastMonthTotal > 0) {
    const diff = thisMonthTotal - lastMonthTotal;
    const percent = (Math.abs(diff) / lastMonthTotal) * 100;
    if (diff > 0) {
      bulletPoints.push(`Pengeluaran bulan ini naik sebesar ${formatRupiah(diff)} (${percent.toFixed(0)}%) dibanding bulan lalu.`);
    } else if (diff < 0) {
      bulletPoints.push(`Pengeluaran bulan ini turun sebesar ${formatRupiah(Math.abs(diff))} (${percent.toFixed(0)}%) dibanding bulan lalu (efisiensi bagus!).`);
    } else {
      bulletPoints.push(`Pengeluaran bulan ini stabil, sama dengan bulan lalu yaitu sebesar ${formatRupiah(thisMonthTotal)}.`);
    }
  } else if (thisMonthTotal > 0 && lastMonthTotal === 0) {
    bulletPoints.push(`Pengeluaran Anda bulan ini tercatat sebesar ${formatRupiah(thisMonthTotal)} (belum ada data bulan lalu).`);
  } else {
    bulletPoints.push('Belum ada pengeluaran yang dicatat untuk bulan berjalan ini.');
  }

  let maxMonthKey = '';
  let maxAmount = 0;
  for (const key in monthlySums) {
    if (monthlySums[key] > maxAmount) {
      maxAmount = monthlySums[key];
      maxMonthKey = key;
    }
  }

  if (maxMonthKey && maxAmount > 0) {
    const [y, m] = maxMonthKey.split('-');
    const monthName = MONTH_NAMES_SHORT[parseInt(m) - 1];
    bulletPoints.push(`Pengeluaran tertinggi terjadi pada bulan ${monthName} '${y.slice(-2)} sebesar ${formatRupiah(maxAmount)}.`);
  }

  return bulletPoints;
};

const MonthlyExpenseChart = ({ data }) => {
  const chartHeight = 110;
  const paddingBottom = 20;
  const paddingTop = 20;
  const totalHeight = chartHeight + paddingTop + paddingBottom;
  const chartWidth = 300;

  const maxAmount = Math.max(...data.map(d => d.amount), 100000);

  return (
    <View style={styles.chartSvgWrapper}>
      <Svg width={chartWidth} height={totalHeight}>
        {data.map((item, index) => {
          const barWidth = 36;
          const gap = (chartWidth - (data.length * barWidth)) / (data.length + 1);
          const x = gap + index * (barWidth + gap);
          const valuePercent = item.amount / maxAmount;
          const barHeight = valuePercent * (chartHeight - 10);
          const y = chartHeight - barHeight + paddingTop;

          const formatShortNominal = (val) => {
            if (val >= 1000000) return `${(val / 1000000).toFixed(1).replace('.0', '')} Jt`;
            if (val >= 1000) return `${(val / 1000).toFixed(0)} Rb`;
            return `${val}`;
          };

          return (
            <G key={item.key}>
              {/* Vertical Bar */}
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 4)}
                rx={6}
                fill={item.amount > 0 ? '#23752c' : '#dee5d6'}
              />

              {/* Amount Text */}
              {item.amount > 0 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 6}
                  fontSize={10}
                  fontFamily="PublicSans-Bold"
                  fontWeight="bold"
                  fill="#171d14"
                  textAnchor="middle"
                >
                  {formatShortNominal(item.amount)}
                </SvgText>
              )}

              {/* Month Label */}
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight + paddingTop + 15}
                fontSize={11}
                fontFamily="PublicSans-SemiBold"
                fill="#707a6c"
                textAnchor="middle"
              >
                {item.label}
              </SvgText>
            </G>
          );
        })}

        <Line
          x1={0}
          y1={chartHeight + paddingTop}
          x2={chartWidth}
          y2={chartHeight + paddingTop}
          stroke="rgba(0,0,0,0.1)"
          strokeWidth={1}
        />
      </Svg>
    </View>
  );
};

export const BerandaScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [activeCycles, setActiveCycles] = useState([]);
  const [archivedCycles, setArchivedCycles] = useState([]);

  // Navigation & Sub-page state
  const [selectedDetailCycleId, setSelectedDetailCycleId] = useState(null);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [detailTab, setDetailTab] = useState('analisis'); // 'analisis' | 'expenses'

  // Calculator inputs
  const [hasilPanen, setHasilPanen] = useState('');
  const [hargaJual, setHargaJual] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [calculatorResult, setCalculatorResult] = useState(0);
  const [isArchiving, setIsArchiving] = useState(false);

  // Modals visibility states
  const [addExpenseModalVisible, setAddExpenseModalVisible] = useState(false);
  const [editCycleModalVisible, setEditCycleModalVisible] = useState(false);
  const [cropSelectionModalVisible, setCropSelectionModalVisible] = useState(false);
  const [categorySelectionModalVisible, setCategorySelectionModalVisible] = useState(false);

  // Edit Cycle states
  const [editCycleLahan, setEditCycleLahan] = useState('');
  const [editCycleCrop, setEditCycleCrop] = useState('Padi');
  const [editCycleCropLainnya, setEditCycleCropLainnya] = useState('');

  const [editCycleLahanError, setEditCycleLahanError] = useState('');
  const [editCycleCropError, setEditCycleCropError] = useState('');
  const [editCycleCropLainnyaError, setEditCycleCropLainnyaError] = useState('');

  // Add Expense states
  const [fastExpenseCycleId, setFastExpenseCycleId] = useState('');
  const [fastExpenseName, setFastExpenseName] = useState('');
  const [fastExpenseCategory, setFastExpenseCategory] = useState('pupuk');
  const [fastExpenseNominal, setFastExpenseNominal] = useState('');

  const [fastExpenseNameError, setFastExpenseNameError] = useState('');
  const [fastExpenseNominalError, setFastExpenseNominalError] = useState('');

  // Tour Refs & State
  const scrollRef = useRef(null);
  const addBtnRef = useRef(null);
  const chartRef = useRef(null);
  const historyRef = useRef(null);
  const [tourVisible, setTourVisible] = useState(false);

  const [detailTourVisible, setDetailTourVisible] = useState(false);
  const detailTabRef = useRef(null);
  const detailCalcCardRef = useRef(null);
  const detailAddExpenseRef = useRef(null);

  // History section filters & pagination states
  const [historyMonthFilter, setHistoryMonthFilter] = useState('all');
  const [historyYearFilter, setHistoryYearFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyMonthModalVisible, setHistoryMonthModalVisible] = useState(false);
  const [historyYearModalVisible, setHistoryYearModalVisible] = useState(false);
  const [activeCropsPage, setActiveCropsPage] = useState(1);

  const getAvailableHistoryYears = () => {
    const years = archivedCycles
      .map(c => {
        if (!c.endDate) return null;
        return c.endDate.split('-')[0];
      })
      .filter(Boolean);
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => b.localeCompare(a));
    if (uniqueYears.length === 0) {
      return [String(new Date().getFullYear())];
    }
    return uniqueYears;
  };

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
      title: 'Daftar Tanaman Aktif',
      description: 'Di sini Anda dapat melihat semua komoditas tanaman yang sedang ditanam aktif beserta modal pengeluarannya. Ketuk salah satunya untuk melihat analisis detail dan kalkulator panen.',
      ref: addBtnRef,
      onBeforeShow: () => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    },
    {
      title: 'Grafik & Tren Bulanan',
      description: 'Grafik batang vertikal ini merangkum total pengeluaran Anda dari bulan ke bulan selama 5 bulan terakhir secara visual.',
      ref: chartRef,
      onBeforeShow: () => {
        scrollRef.current?.scrollTo({ y: 150, animated: true });
      }
    },
    {
      title: 'Riwayat Tanaman',
      description: 'Semua pembukuan tanaman yang telah selesai dan tutup buku akan tersimpan di riwayat ini untuk dipantau kapan saja.',
      ref: historyRef,
      onBeforeShow: () => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    },
  ];

  const detailTourSteps = [
    {
      title: 'Navigasi Detail Tanaman',
      description: 'Gunakan tab ini untuk berpindah antara "Analisis & Panen" dan "Detail Pengeluaran" tanaman Anda.',
      ref: detailTabRef,
      popoverPosition: 'top',
    },
    {
      title: 'Kalkulator Panen',
      description: 'Masukkan estimasi hasil panen (kg) dan perkiraan harga jual (Rp/kg) untuk menghitung dan menyimpan proyeksi keuntungan/kerugian Anda.',
      ref: detailCalcCardRef,
      onBeforeShow: () => {
        setDetailTab('analisis');
      }
    },
    {
      title: 'Catatan & Tambah Pengeluaran',
      description: 'Lihat rincian semua pengeluaran untuk tanaman ini secara detail, atau catat pengeluaran baru di sini.',
      ref: detailAddExpenseRef,
      onBeforeShow: () => {
        setDetailTab('expenses');
      }
    }
  ];

  const loadData = async () => {
    const loadedExpenses = await getExpenses();
    const loadedCycles = await getCycles();
    setExpenses(loadedExpenses);
    setCycles(loadedCycles);

    const active = loadedCycles.filter(c => c.status === 'active');
    const archived = loadedCycles.filter(c => c.status === 'archived');
    setActiveCycles(active);
    setArchivedCycles(archived);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleCloseDetail = () => {
    setSelectedDetailCycleId(null);
    navigation.setParams({ isDetailOpen: false });
  };

  const handleSelectCycle = (cycle) => {
    setSelectedDetailCycleId(cycle.id);
    setIsViewingHistory(cycle.status === 'archived');
    setDetailTab('analisis');
    setShowResult(false);
    navigation.setParams({ isDetailOpen: true });

    setHasilPanen(cycle.harvestResult ? cycle.harvestResult.toString() : '');
    setHargaJual(cycle.harvestPrice ? formatNominalInput(cycle.harvestPrice.toString()) : '');
  };



  const handleEditCycle = async () => {
    let isValid = true;
    setEditCycleLahanError('');
    setEditCycleCropError('');
    setEditCycleCropLainnyaError('');

    if (!editCycleLahan.trim()) {
      setEditCycleLahanError('Nama lahan harus diisi');
      isValid = false;
    }

    const selectedCrop = editCycleCrop === 'Lainnya' ? editCycleCropLainnya.trim() : editCycleCrop;
    if (editCycleCrop === 'Lainnya' && !editCycleCropLainnya.trim()) {
      setEditCycleCropLainnyaError('Nama tanaman harus diisi');
      isValid = false;
    }

    if (!isValid) return;

    try {
      await updateCycleInfo(selectedDetailCycleId, selectedCrop, editCycleLahan);
      Alert.alert('Sukses', 'Informasi tanaman berhasil diubah!');
      setEditCycleModalVisible(false);
      await loadData();

      const loadedCycles = await getCycles();
      const updated = loadedCycles.find(c => c.id === selectedDetailCycleId);
      if (updated) {
        setSelectedDetailCycleId(updated.id);
      }
    } catch (err) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat mengubah informasi tanaman.');
      console.error(err);
    }
  };

  const handleDeleteCycle = () => {
    if (!selectedDetailCycleId) return;
    const cycle = cycles.find(c => c.id === selectedDetailCycleId);
    if (!cycle) return;

    Alert.alert(
      'Hapus Tanaman',
      `Apakah Anda yakin ingin menghapus "${cycle.name}"?\n\nTindakan ini akan menghapus tanaman beserta seluruh catatan pengeluaran di dalamnya secara permanen.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Permanen',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCycleAndExpenses(selectedDetailCycleId);
              Alert.alert('Sukses', `Tanaman "${cycle.name}" berhasil dihapus.`);
              handleCloseDetail();
              await loadData();
            } catch (err) {
              Alert.alert('Gagal', 'Gagal menghapus tanaman.');
              console.error(err);
            }
          }
        }
      ]
    );
  };

  const handleAddExpenseFast = async () => {
    let isValid = true;
    setFastExpenseNameError('');
    setFastExpenseNominalError('');

    if (!fastExpenseName.trim()) {
      setFastExpenseNameError('Nama pengeluaran harus diisi');
      isValid = false;
    }

    const parsedNominal = parseNominalInput(fastExpenseNominal);
    if (!fastExpenseNominal || isNaN(parsedNominal) || parsedNominal <= 0) {
      setFastExpenseNominalError('Nominal harus lebih dari 0');
      isValid = false;
    }

    if (!isValid) return;

    try {
      const cycleObj = activeCycles.find(c => c.id === fastExpenseCycleId);
      const crop = cycleObj ? cycleObj.crop : 'Padi';

      await addExpense({
        tanggal: getTodayString(),
        nama_pengeluaran: fastExpenseName.trim(),
        kategori: fastExpenseCategory,
        nominal: parsedNominal,
        siklusId: fastExpenseCycleId,
        komoditas: crop,
      });

      Alert.alert('Sukses', 'Pengeluaran berhasil dicatat!');
      setAddExpenseModalVisible(false);
      await loadData();
    } catch (err) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan pengeluaran.');
      console.error(err);
    }
  };

  const handleDeleteExpense = (id, name) => {
    if (isViewingHistory) return;

    Alert.alert(
      'Hapus Pengeluaran',
      `Apakah Anda yakin ingin menghapus pengeluaran "${name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const { deleteExpense } = require('../utils/storage');
              await deleteExpense(id);
              Alert.alert('Sukses', 'Pengeluaran berhasil dihapus.');
              await loadData();
            } catch (err) {
              Alert.alert('Gagal', 'Gagal menghapus pengeluaran.');
              console.error(err);
            }
          }
        }
      ]
    );
  };

  const handleExpenseOptions = (id, name) => {
    if (isViewingHistory) return;

    Alert.alert(
      'Pilih Aksi',
      `Pilih tindakan untuk pengeluaran "${name}":`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ubah (Edit)',
          onPress: () => {
            navigation.navigate('EditCatatan', { expenseId: id });
          }
        },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => handleDeleteExpense(id, name)
        }
      ]
    );
  };

  const handleCalculate = async () => {
    if (!selectedDetailCycleId) return;

    const hasil = parseFloat(hasilPanen) || 0;
    const harga = parseNominalInput(hargaJual) || 0;

    if (hasil <= 0 || harga <= 0) {
      Alert.alert('Info', 'Mohon masukkan jumlah panen dan harga jual yang valid.');
      return;
    }

    await updateCycleHarvest(selectedDetailCycleId, hasil, harga);
    await loadData();

    const calculatedRevenue = hasil * harga;
    setCalculatorResult(calculatedRevenue);
    setShowResult(true);
    Alert.alert('Sukses', 'Estimasi hasil panen berhasil diperbarui!');
  };

  const handleReset = async () => {
    if (!selectedDetailCycleId) return;
    await updateCycleHarvest(selectedDetailCycleId, 0, 0);
    await loadData();
    setHasilPanen('');
    setHargaJual('');
    setShowResult(false);
    setCalculatorResult(0);
  };

  const handleArchiveCycle = () => {
    if (!selectedDetailCycleId) return;
    const cycle = activeCycles.find(c => c.id === selectedDetailCycleId);
    if (!cycle) return;

    Alert.alert(
      'Selesaikan Masa Tanam',
      `Apakah Anda yakin ingin menyelesaikan masa tanam untuk "${cycle.name}"?\n\nSemua pengeluaran aktif dalam siklus ini akan diarsipkan, dan tanaman ini akan dipindahkan ke riwayat pengarsipan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Selesaikan & Tutup Buku',
          style: 'destructive',
          onPress: async () => {
            setIsArchiving(true);
            try {
              await archiveCycleBySiklus(selectedDetailCycleId);
              Alert.alert('Sukses', `Masa tanam untuk "${cycle.name}" berhasil diselesaikan!\nLaporan dipindahkan ke riwayat.`);
              await loadData();
              handleCloseDetail();
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

  const activeExpenses = expenses.filter(exp => !exp.is_archived);
  const selectedCycle = cycles.find(c => c.id === selectedDetailCycleId);
  const cycleExpenses = expenses.filter(e => e.siklusId === selectedDetailCycleId);

  const totalExpense = isViewingHistory
    ? (selectedCycle?.totalExpenses || 0)
    : calculateTotalPengeluaran(cycleExpenses);

  // Gunakan state input lokal jika ada untuk reaktivitas instan dan real-time
  const currentHarvestResult = isViewingHistory
    ? (selectedCycle?.harvestResult || 0)
    : (parseFloat(hasilPanen) || parseFloat(selectedCycle?.harvestResult) || 0);

  const currentHarvestPrice = isViewingHistory
    ? (selectedCycle?.harvestPrice || 0)
    : (parseNominalInput(hargaJual) || parseFloat(selectedCycle?.harvestPrice) || 0);

  const cycleRevenue = isViewingHistory
    ? (selectedCycle?.estRevenue || 0)
    : (currentHarvestResult * currentHarvestPrice);

  const cycleProfit = isViewingHistory
    ? (selectedCycle?.estProfit || 0)
    : (cycleRevenue - totalExpense);

  const marginPercent = isViewingHistory
    ? (selectedCycle?.marginPercent || 0)
    : calculatePersentase(cycleProfit, cycleRevenue);

  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentValue = Math.max(0, Math.min(100, marginPercent));
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

  const insight = getInsightData(marginPercent);

  // RENDER SUB-PAGE: DETAIL TANAMAN (2 TABS)
  if (selectedDetailCycleId && selectedCycle) {
    const cropColor = getCropColor(selectedCycle.crop);
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        {/* Header Sub-page */}
        <View style={[styles.detailHeader, { height: 56 + insets.top, paddingTop: insets.top, backgroundColor: '#012d1d' }]}>
          <Pressable
            onPress={handleCloseDetail}
            style={({ pressed }) => [styles.detailBackBtn, pressed && styles.pressed]}
          >
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>
          <Text style={styles.detailHeaderTitle}>
            {selectedCycle.status === 'archived' ? 'Riwayat Tanaman' : 'Detail Tanaman'}
          </Text>
        </View>

        {/* Crop Info Banner (Compact Dashboard Header) */}
        <View style={styles.detailBannerContainer}>
          <View style={styles.detailBannerLeft}>
            <View style={[styles.detailBannerEmojiContainer, { backgroundColor: `${cropColor}18` }]}>
              <Text style={styles.detailBannerEmoji}>{getCropEmoji(selectedCycle.crop)}</Text>
            </View>
            <View style={styles.detailBannerTextContainer}>
              <Text style={styles.detailBannerCrop} numberOfLines={1}>
                {selectedCycle.crop}
              </Text>
              <Text style={styles.detailBannerLahan} numberOfLines={1}>
                📍 {selectedCycle.name.split(' di ').slice(1).join(' di ') || 'Lahan Utama'}
              </Text>
              <Text style={styles.detailBannerDate} numberOfLines={1}>
                📅 {selectedCycle.status === 'archived'
                  ? `${selectedCycle.startDate} - ${selectedCycle.endDate}`
                  : `Mulai: ${selectedCycle.startDate}`}
              </Text>
            </View>
          </View>

          {!isViewingHistory && (
            <View style={styles.detailBannerActions}>
              <Pressable
                onPress={() => setDetailTourVisible(true)}
                style={({ pressed }) => [styles.detailBannerActionBtn, pressed && styles.pressed]}
              >
                <MaterialIcons name="help-outline" size={18} color="#ffffff" />
              </Pressable>
              <Pressable
                onPress={() => {
                  const parts = selectedCycle.name.split(' di ');
                  const landPart = parts.length > 1 ? parts[1] : '';
                  setEditCycleCrop(selectedCycle.crop);
                  setEditCycleCropLainnya('');
                  setEditCycleLahan(landPart);
                  setEditCycleLahanError('');
                  setEditCycleCropError('');
                  setEditCycleCropLainnyaError('');
                  setEditCycleModalVisible(true);
                }}
                style={({ pressed }) => [styles.detailBannerActionBtn, pressed && styles.pressed]}
              >
                <MaterialIcons name="edit" size={18} color="#ffffff" />
              </Pressable>
              <Pressable
                onPress={handleDeleteCycle}
                style={({ pressed }) => [
                  styles.detailBannerActionBtn,
                  styles.detailBannerActionBtnDelete,
                  pressed && styles.pressed
                ]}
              >
                <MaterialIcons name="delete" size={18} color="#ff8b8b" />
              </Pressable>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator={false}>
          {detailTab === 'analisis' ? (
            // TAB 1: ANALISIS & PANEN
            <View>
              {/* Calculator Section */}
              <View ref={detailCalcCardRef} collapsable={false} style={styles.calculatorCard}>
                <View style={styles.calculatorHeader}>
                  <View style={styles.calculatorIconBadge}>
                    <MaterialIcons name="calculate" size={24} color={theme.colors.onPrimary} />
                  </View>
                  <Text style={styles.calculatorTitle}>Kalkulator Panen</Text>
                </View>
                <Text style={styles.calculatorDesc}>Masukkan estimasi panen tanaman ini.</Text>

                <InputField
                  label="Total Pengeluaran Tanaman (Rp)"
                  value={formatRupiah(totalExpense)}
                  icon="payments"
                  editable={false}
                  infoMessage="Nilai ini diambil otomatis dari catatan pengeluaran tanaman ini."
                />

                <InputField
                  label="Estimasi Hasil Panen (Kg)"
                  placeholder="Contoh: 10"
                  value={hasilPanen}
                  onChangeText={setHasilPanen}
                  keyboardType="numeric"
                  icon="eco"
                  editable={!isViewingHistory}
                />

                <InputField
                  label="Harga Jual per Kg (Rp)"
                  placeholder="Contoh: 5.000"
                  value={hargaJual}
                  onChangeText={(text) => setHargaJual(formatNominalInput(text))}
                  keyboardType="numeric"
                  icon="sell"
                  editable={!isViewingHistory}
                />

                {!isViewingHistory && (
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
                )}

                {(showResult || (selectedCycle.harvestResult > 0)) ? (
                  <>
                    <View style={styles.resultDisplay}>
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
                        <Text style={styles.resultLabel}>Total Pendapatan</Text>
                        <Text style={[styles.resultValueText, { color: '#0e6c4a' }]}>{formatRupiah(cycleRevenue)}</Text>
                      </View>
                      <View style={styles.resultDivider} />
                      <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Total Pengeluaran</Text>
                        <Text style={[styles.resultValueText, { color: '#ba1a1a' }]}>{formatRupiah(totalExpense)}</Text>
                      </View>
                      <View style={styles.resultDivider} />
                      <View style={styles.resultRow}>
                        <Text style={[styles.resultLabel, { fontFamily: 'PublicSans-Bold', color: '#012d1d' }]}>Estimasi Untung/Rugi</Text>
                        <Text style={[
                          styles.resultValue,
                          { color: cycleProfit >= 0 ? '#0e6c4a' : '#ba1a1a', fontWeight: '800' }
                        ]}>
                          {formatRupiah(cycleProfit)}
                        </Text>
                      </View>
                    </View>

                    {/* Margin Score (Insight Card) */}
                    <View style={[styles.insightCard, { marginTop: 16 }]}>
                      <View style={styles.scoreCircleContainer}>
                        <Svg key={`${selectedDetailCycleId}_${percentValue}`} width={size} height={size}>
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
                  </>
                ) : null}
              </View>

              {/* Operations Panel (Hanya jika aktif) */}
              {!isViewingHistory && (
                <View style={{ marginBottom: 20 }}>
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
                </View>
              )}
            </View>
          ) : (
            // TAB 2: DETAIL PENGELUARAN
            <View>
              <Text style={styles.expensesListTitle}>Catatan Biaya Pengeluaran</Text>

              {!isViewingHistory && (
                <Pressable
                  ref={detailAddExpenseRef}
                  collapsable={false}
                  onPress={() => {
                    setFastExpenseCycleId(selectedDetailCycleId);
                    setFastExpenseName('');
                    setFastExpenseCategory('pupuk');
                    setFastExpenseNominal('');
                    setFastExpenseNameError('');
                    setFastExpenseNominalError('');
                    setAddExpenseModalVisible(true);
                  }}
                  style={({ pressed }) => [styles.fastExpenseAddBtn, pressed && styles.pressed]}
                >
                  <MaterialIcons name="add" size={20} color="#ffffff" />
                  <Text style={styles.fastExpenseAddBtnText}>Catat Biaya Baru</Text>
                </Pressable>
              )}

              {cycleExpenses.length === 0 ? (
                <View style={styles.emptyExpensesCard}>
                  <Text style={styles.emptyExpensesText}>Belum ada pengeluaran dicatat.</Text>
                </View>
              ) : (
                cycleExpenses.map(exp => (
                  <View
                    key={exp.id}
                    style={styles.expenseItem}
                  >
                    {/* Left: Icon */}
                    <View style={styles.expenseItemIconBg}>
                      <MaterialIcons
                        name={getCategoryById(exp.kategori).icon}
                        size={22}
                        color="#0e6c4a"
                      />
                    </View>

                    {/* Middle: Info Stack */}
                    <View style={styles.expenseItemMiddle}>
                      <Text style={styles.expenseItemName} numberOfLines={2}>
                        {exp.nama_pengeluaran}
                      </Text>
                      <View style={styles.expenseItemMetaRow}>
                        <Text style={styles.expenseItemCategoryText}>
                          {getCategoryById(exp.kategori).label}
                        </Text>
                        <Text style={styles.expenseItemBullet}>•</Text>
                        <Text style={styles.expenseItemDate}>
                          {exp.tanggal}
                        </Text>
                      </View>
                    </View>

                    {/* Right: Nominal & Actions Stack */}
                    <View style={styles.expenseItemRight}>
                      <Text style={styles.expenseItemNominal}>
                        {formatRupiah(exp.nominal)}
                      </Text>
                      {!isViewingHistory && (
                        <View style={styles.expenseItemActions}>
                          <Pressable
                            onPress={() => navigation.navigate('EditCatatan', { expenseId: exp.id })}
                            style={({ pressed }) => [styles.expenseActionBtnEdit, pressed && styles.pressed]}
                          >
                            <MaterialIcons name="edit" size={18} color="#0e6c4a" />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteExpense(exp.id, exp.nama_pengeluaran)}
                            style={({ pressed }) => [styles.expenseActionBtnDelete, pressed && styles.pressed]}
                          >
                            <MaterialIcons name="delete" size={18} color="#ba1a1a" />
                          </Pressable>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>

        {/* Bottom Tab Bar for Crop Details */}
        {(() => {
          const hasSafeArea = insets.bottom > 0;
          const paddingTop = hasSafeArea ? 6 : 0;
          const paddingBottom = hasSafeArea ? insets.bottom - 6 : 0;
          const totalHeight = 56 + paddingTop + paddingBottom;
          return (
            <View
              ref={detailTabRef}
              collapsable={false}
              style={[
                styles.detailBottomTabBar,
                {
                  height: totalHeight,
                  paddingTop,
                  paddingBottom,
                }
              ]}
            >
              <View style={styles.detailBottomTabBarContent}>
                <Pressable
                  onPress={() => setDetailTab('analisis')}
                  style={({ pressed }) => [
                    styles.detailBottomTabBtn,
                    detailTab === 'analisis' ? styles.detailBottomTabBtnActive : styles.detailBottomTabBtnInactive,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={detailTab === 'analisis' ? styles.detailBottomTabActiveIconContainer : null}>
                    <MaterialIcons
                      name="analytics"
                      size={22}
                      color={detailTab === 'analisis' ? '#cbffc2' : 'rgba(255, 255, 255, 0.6)'}
                    />
                  </View>
                  <Text style={[
                    styles.detailBottomTabBtnText,
                    detailTab === 'analisis' ? styles.detailBottomTabBtnTextActive : styles.detailBottomTabBtnTextInactive
                  ]}>
                    Analisis & Panen
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setDetailTab('expenses')}
                  style={({ pressed }) => [
                    styles.detailBottomTabBtn,
                    detailTab === 'expenses' ? styles.detailBottomTabBtnActive : styles.detailBottomTabBtnInactive,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={detailTab === 'expenses' ? styles.detailBottomTabActiveIconContainer : null}>
                    <MaterialIcons
                      name="receipt-long"
                      size={22}
                      color={detailTab === 'expenses' ? '#cbffc2' : 'rgba(255, 255, 255, 0.6)'}
                    />
                  </View>
                  <Text style={[
                    styles.detailBottomTabBtnText,
                    detailTab === 'expenses' ? styles.detailBottomTabBtnTextActive : styles.detailBottomTabBtnTextInactive
                  ]}>
                    Detail Pengeluaran
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })()}

        {/* Modal 2: Catat Pengeluaran Cepat (dari Tab 2) */}
        <Modal
          visible={addExpenseModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setAddExpenseModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setAddExpenseModalVisible(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ width: '100%' }}
            >
              <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.modalTitle}>Catat Pengeluaran Lahan</Text>

                <Text style={styles.modalTargetCycleText}>
                  Tanaman: {selectedCycle.name}
                </Text>

                <InputField
                  label="Nama Pengeluaran"
                  placeholder="Contoh: Pupuk urea, Pestisida"
                  value={fastExpenseName}
                  onChangeText={setFastExpenseName}
                  error={fastExpenseNameError}
                  icon="label"
                  autoCapitalize="sentences"
                />

                <InputField
                  label="Kategori"
                  placeholder="Pilih Kategori"
                  value={getCategoryById(fastExpenseCategory).label}
                  isDropdown={true}
                  onPress={() => {
                    setCategorySelectionModalVisible(true);
                  }}
                  icon="category"
                />

                <InputField
                  label="Nominal (Rp)"
                  placeholder="Contoh: 100.000"
                  value={fastExpenseNominal}
                  onChangeText={(text) => setFastExpenseNominal(formatNominalInput(text))}
                  keyboardType="numeric"
                  error={fastExpenseNominalError}
                  icon="payments"
                />

                <View style={styles.modalButtonsRow}>
                  <Pressable
                    onPress={handleAddExpenseFast}
                    style={styles.modalSaveBtn}
                  >
                    <Text style={styles.modalSaveBtnText}>Simpan Biaya</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setAddExpenseModalVisible(false)}
                    style={styles.modalCancelBtn}
                  >
                    <Text style={styles.modalCancelBtnText}>Batal</Text>
                  </Pressable>
                </View>
              </Pressable>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>

        {/* Modal 4: Category Selection Modal */}
        <Modal
          visible={categorySelectionModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setCategorySelectionModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setCategorySelectionModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Pilih Kategori</Text>
              {categories.map((cat) => {
                const isSelected = fastExpenseCategory === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      setFastExpenseCategory(cat.id);
                      setCategorySelectionModalVisible(false);
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
                onPress={() => setCategorySelectionModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>Batal</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* Modal 5: Edit Cycle Modal */}
        <Modal
          visible={editCycleModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setEditCycleModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setEditCycleModalVisible(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ width: '100%' }}
            >
              <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                  <Text style={styles.modalTitle}>Ubah Info Tanaman</Text>

                  <Text style={styles.modalFieldLabel}>Jenis Tanaman</Text>
                  <View style={styles.cropSelectorGrid}>
                    {standardCrops.map((cropItem) => {
                      const isSelected = editCycleCrop === cropItem.id;
                      return (
                        <Pressable
                          key={cropItem.id}
                          onPress={() => {
                            setEditCycleCrop(cropItem.id);
                            setEditCycleCropError('');
                          }}
                          style={[
                            styles.cropGridItem,
                            isSelected && styles.cropGridItemSelected
                          ]}
                        >
                          <Text style={styles.cropGridItemEmoji}>{cropItem.emoji}</Text>
                          <Text style={[
                            styles.cropGridItemText,
                            isSelected && styles.cropGridItemTextSelected
                          ]}>{cropItem.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {editCycleCropError ? <Text style={styles.modalErrorText}>{editCycleCropError}</Text> : null}

                  {editCycleCrop === 'Lainnya' && (
                    <InputField
                      label="Nama Tanaman Baru"
                      placeholder="Contoh: Semangka"
                      value={editCycleCropLainnya}
                      onChangeText={setEditCycleCropLainnya}
                      error={editCycleCropLainnyaError}
                      icon="eco"
                      autoCapitalize="words"
                    />
                  )}

                  <InputField
                    label="Nama Lahan / Keterangan"
                    placeholder="Contoh: Lahan Barat, Sawah Depan"
                    value={editCycleLahan}
                    onChangeText={setEditCycleLahan}
                    error={editCycleLahanError}
                    icon="map"
                    autoCapitalize="sentences"
                    maxLength={30}
                  />

                  <View style={styles.modalButtonsRow}>
                    <Pressable
                      onPress={handleEditCycle}
                      style={styles.modalSaveBtn}
                    >
                      <Text style={styles.modalSaveBtnText}>Simpan Perubahan</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setEditCycleModalVisible(false)}
                      style={styles.modalCancelBtn}
                    >
                      <Text style={styles.modalCancelBtnText}>Batal</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              </Pressable>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>

        {/* Feature Tour untuk Detail Tanaman */}
        <FeatureTour
          visible={detailTourVisible}
          steps={detailTourSteps}
          onFinish={() => setDetailTourVisible(false)}
          onClose={() => setDetailTourVisible(false)}
        />

      </KeyboardAvoidingView>
    );
  }

  const filteredHistoryCycles = archivedCycles.filter(cycle => {
    if (!cycle.endDate) return false;
    const [year, month] = cycle.endDate.split('-');
    const matchesMonth = historyMonthFilter === 'all' || month === historyMonthFilter;
    const matchesYear = historyYearFilter === 'all' || year === historyYearFilter;
    return matchesMonth && matchesYear;
  });

  const HISTORY_PAGE_SIZE = 5;
  const totalHistoryPages = Math.ceil(filteredHistoryCycles.length / HISTORY_PAGE_SIZE);
  const activeHistoryPage = Math.min(historyPage, totalHistoryPages || 1);
  const startIndex = (activeHistoryPage - 1) * HISTORY_PAGE_SIZE;
  const paginatedHistoryCycles = filteredHistoryCycles.slice(startIndex, startIndex + HISTORY_PAGE_SIZE);

  const ACTIVE_ROWS_PAGE_SIZE = 3;
  const totalActiveRowsPages = Math.ceil((activeCycles.length - 2) / ACTIVE_ROWS_PAGE_SIZE);
  const activeRowsPage = Math.min(activeCropsPage, totalActiveRowsPages || 1);
  const paginatedRowCycles = activeCycles.slice(
    2 + (activeRowsPage - 1) * ACTIVE_ROWS_PAGE_SIZE,
    2 + activeRowsPage * ACTIVE_ROWS_PAGE_SIZE
  );

  // DEFAULT VIEW: HOME SCREEN (3 SECTIONS)
  return (
    <View style={styles.keyboardContainer}>
      {/* Welcome Header */}
      <View style={[styles.header, { height: 88 + insets.top, paddingTop: insets.top }]}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerIconBadge}>
            <MaterialIcons name="agriculture" size={28} color="#cbffc2" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerSubtitle}>{(() => {
              const date = new Date();
              const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
              const hour = new Date(utc + (3600000 * 7)).getHours(); // WIB
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
        {/* SECTION 1: PEMBUNGKUS TANAMAN AKTIF */}
        <View style={styles.homeWidgetCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Tanaman Aktif</Text>
            <Pressable
              ref={addBtnRef}
              onPress={() => navigation.navigate('TambahTanaman')}
              style={({ pressed }) => [
                styles.sectionHeaderBtn,
                pressed && styles.pressed
              ]}
            >
              <MaterialIcons name="add" size={16} color="#0e6c4a" style={{ marginRight: 4 }} />
              <Text style={styles.sectionHeaderBtnText}>Mulai Tanam</Text>
            </Pressable>
          </View>

          {activeCycles.length === 0 ? (
            <View style={styles.emptyCropsCard}>
              <MaterialIcons name="grass" size={32} color="#707a6c" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyCropsText}>Belum ada tanaman aktif.</Text>
              <Pressable
                onPress={() => navigation.navigate('TambahTanaman')}
                style={styles.emptyCropsBtn}
              >
                <Text style={styles.emptyCropsBtnText}>Mulai Tanam Sekarang</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              {/* Cards for up to 2 items */}
              <View style={styles.activeCropsCardsRow}>
                {activeCycles.slice(0, 2).map((cycle) => {
                  const cycleExpenses = expenses.filter(e => e.siklusId === cycle.id && !e.is_archived);
                  const totalExpense = calculateTotalPengeluaran(cycleExpenses);
                  const cropColor = getCropColor(cycle.crop);
                  const cropEmoji = getCropEmoji(cycle.crop);
                  const cardCount = Math.min(activeCycles.length, 2);
                  return (
                    <Pressable
                      key={cycle.id}
                      onPress={() => handleSelectCycle(cycle)}
                      style={({ pressed }) => [
                        styles.cropCardCustom,
                        { width: cardCount === 1 ? '48%' : undefined, flex: cardCount === 2 ? 1 : undefined },
                        pressed && styles.pressed
                      ]}
                    >
                      <View style={[styles.cropCardIconContainer, { backgroundColor: `${cropColor}15` }]}>
                        <Text style={styles.cropCardEmoji}>{cropEmoji}</Text>
                      </View>
                      <Text style={styles.cropCardName} numberOfLines={1}>{cycle.name}</Text>
                      <View>
                        <Text style={styles.cropCardLabel}>Total Modal:</Text>
                        <Text style={styles.cropCardExpense}>{formatRupiah(totalExpense)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* List rows for items > 2 */}
              {activeCycles.length > 2 && (
                <View style={{ marginTop: 4 }}>
                  {paginatedRowCycles.map((cycle) => {
                    const cycleExpenses = expenses.filter(e => e.siklusId === cycle.id && !e.is_archived);
                    const totalExpense = calculateTotalPengeluaran(cycleExpenses);
                    const cropColor = getCropColor(cycle.crop);
                    const cropEmoji = getCropEmoji(cycle.crop);
                    return (
                      <Pressable
                        key={cycle.id}
                        onPress={() => handleSelectCycle(cycle)}
                        style={({ pressed }) => [
                          styles.cropRow,
                          pressed && styles.pressed
                        ]}
                      >
                        <View style={[styles.cropRowIcon, { backgroundColor: `${cropColor}15` }]}>
                          <Text style={styles.cropRowEmoji}>{cropEmoji}</Text>
                        </View>
                        <View style={styles.cropRowInfo}>
                          <Text style={styles.cropRowName} numberOfLines={1}>{cycle.name}</Text>
                          <Text style={styles.cropRowLabel}>Tanaman Aktif</Text>
                        </View>
                        <View style={styles.cropRowExpenseContainer}>
                          <Text style={styles.cropRowExpenseLabel}>Total Modal</Text>
                          <Text style={styles.cropRowExpenseValue}>{formatRupiah(totalExpense)}</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color="#707a6c" style={{ marginLeft: 8 }} />
                      </Pressable>
                    );
                  })}

                  {/* Pagination for active crops rows */}
                  {totalActiveRowsPages > 1 && (
                    <View style={[styles.paginationRow, { marginTop: 8 }]}>
                      <Pressable
                        disabled={activeRowsPage === 1}
                        onPress={() => setActiveCropsPage(prev => Math.max(prev - 1, 1))}
                        style={[
                          styles.paginationBtn,
                          activeRowsPage === 1 && styles.paginationBtnDisabled
                        ]}
                      >
                        <MaterialIcons name="chevron-left" size={24} color={activeRowsPage === 1 ? '#a0aaa0' : '#0e6c4a'} />
                      </Pressable>

                      <Text style={styles.paginationText}>
                        Halaman {activeRowsPage} dari {totalActiveRowsPages}
                      </Text>

                      <Pressable
                        disabled={activeRowsPage === totalActiveRowsPages}
                        onPress={() => setActiveCropsPage(prev => Math.min(prev + 1, totalActiveRowsPages))}
                        style={[
                          styles.paginationBtn,
                          activeRowsPage === totalActiveRowsPages && styles.paginationBtnDisabled
                        ]}
                      >
                        <MaterialIcons name="chevron-right" size={24} color={activeRowsPage === totalActiveRowsPages ? '#a0aaa0' : '#0e6c4a'} />
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* SECTION 2: TREN PENGELUARAN BULANAN (SVG) */}
        <View ref={chartRef} style={styles.homeWidgetCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Tren Pengeluaran</Text>
          </View>
          <MonthlyExpenseChart data={getMonthlyChartData(expenses)} />

          {/* Penjelasan Dinamis */}
          <View style={styles.explanationCard}>
            <View style={styles.explanationIconBg}>
              <MaterialIcons name="insights" size={22} color="#0e6c4a" />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              {getDynamicTrendExplanation(expenses).map((point, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 16, color: '#0e6c4a', marginRight: 8, lineHeight: 18 }}>{`\u2022`}</Text>
                  <Text style={styles.explanationText}>{point}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* SECTION 3: RIWAYAT TANAMAN */}
        <View ref={historyRef} style={styles.homeWidgetCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Riwayat Tanaman</Text>
          </View>

          {archivedCycles.length === 0 ? (
            <View style={styles.emptyHistoryCard}>
              <MaterialIcons name="history" size={28} color="#707a6c" style={{ marginBottom: 4 }} />
              <Text style={styles.emptyHistoryText}>Belum ada riwayat pembukuan selesai.</Text>
            </View>
          ) : (
            <>
              {/* Baris Filter */}
              <View style={styles.historyFiltersRow}>
                <Pressable
                  onPress={() => setHistoryMonthModalVisible(true)}
                  style={styles.historyFilterBtn}
                >
                  <Text style={styles.historyFilterBtnText} numberOfLines={1}>
                    {historyMonthFilter === 'all'
                      ? 'Semua Bulan'
                      : INDO_MONTHS[parseInt(historyMonthFilter, 10) - 1]}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={20} color="#707a6c" />
                </Pressable>

                <Pressable
                  onPress={() => setHistoryYearModalVisible(true)}
                  style={styles.historyFilterBtn}
                >
                  <Text style={styles.historyFilterBtnText} numberOfLines={1}>
                    {historyYearFilter === 'all' ? 'Semua Tahun' : historyYearFilter}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={20} color="#707a6c" />
                </Pressable>

                {(historyMonthFilter !== 'all' || historyYearFilter !== 'all') && (
                  <Pressable
                    onPress={() => {
                      setHistoryMonthFilter('all');
                      setHistoryYearFilter('all');
                      setHistoryPage(1);
                    }}
                    style={styles.historyFilterClearBtn}
                  >
                    <MaterialIcons name="clear" size={16} color="#ffffff" />
                  </Pressable>
                )}
              </View>

              {/* Daftar Riwayat yang Terfilter & Terpaginasi */}
              {paginatedHistoryCycles.length === 0 ? (
                <View style={styles.emptyHistoryCard}>
                  <MaterialIcons name="filter-list-off" size={28} color="#707a6c" style={{ marginBottom: 4 }} />
                  <Text style={styles.emptyHistoryText}>Tidak ada riwayat tanaman yang cocok dengan filter.</Text>
                </View>
              ) : (
                paginatedHistoryCycles.map((cycle) => {
                  const cropColor = getCropColor(cycle.crop);
                  const cropEmoji = getCropEmoji(cycle.crop);
                  const profit = cycle.estProfit || 0;
                  return (
                    <Pressable
                      key={cycle.id}
                      onPress={() => handleSelectCycle(cycle)}
                      style={({ pressed }) => [
                        styles.historyCard,
                        pressed && styles.pressed
                      ]}
                    >
                      <View style={[styles.historyCardIcon, { backgroundColor: `${cropColor}15` }]}>
                        <Text style={styles.historyCardEmoji}>{cropEmoji}</Text>
                      </View>
                      <View style={styles.historyCardInfo}>
                        <Text style={styles.historyCardName} numberOfLines={1}>{cycle.name}</Text>
                        <Text style={styles.historyCardDate}>Selesai: {cycle.endDate}</Text>
                      </View>
                      <View style={styles.historyCardProfitContainer}>
                        <Text style={[
                          styles.historyCardProfit,
                          { color: profit >= 0 ? theme.colors.secondary : theme.colors.error }
                        ]}>
                          {profit >= 0 ? '+' : ''}{formatRupiah(profit)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}

              {/* Tombol Navigasi Halaman */}
              {totalHistoryPages > 1 && (
                <View style={[styles.paginationRow, { marginTop: 8 }]}>
                  <Pressable
                    disabled={activeHistoryPage === 1}
                    onPress={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                    style={[
                      styles.paginationBtn,
                      activeHistoryPage === 1 && styles.paginationBtnDisabled
                    ]}
                  >
                    <MaterialIcons name="chevron-left" size={24} color={activeHistoryPage === 1 ? '#a0aaa0' : '#0e6c4a'} />
                  </Pressable>

                  <Text style={styles.paginationText}>
                    Halaman {activeHistoryPage} dari {totalHistoryPages}
                  </Text>

                  <Pressable
                    disabled={activeHistoryPage === totalHistoryPages}
                    onPress={() => setHistoryPage(prev => Math.min(prev + 1, totalHistoryPages))}
                    style={[
                      styles.paginationBtn,
                      activeHistoryPage === totalHistoryPages && styles.paginationBtnDisabled
                    ]}
                  >
                    <MaterialIcons name="chevron-right" size={24} color={activeHistoryPage === totalHistoryPages ? '#a0aaa0' : '#0e6c4a'} />
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>

        {/* Banner Illustration */}
        <View style={[styles.bannerContainer, { marginTop: 28 }]}>
          <ImageBackground
            source={require('../../assets/rice_field.png')}
            style={styles.bannerImage}
            imageStyle={styles.bannerImageRound}
          >
            <View style={styles.bannerOverlay}>
              <Text style={styles.bannerText}>
                Catat pengeluaran, pantau estimasi keuntungan, dan sukseskan usaha tani Anda.
              </Text>
            </View>
          </ImageBackground>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pengembang: Tim Pengabdian DPPM BIMA KEMDIKTISAINTEK UNNES 2026
          </Text>
        </View>
      </ScrollView>

      {/* Feature Tour */}
      <FeatureTour
        visible={tourVisible}
        steps={tourSteps}
        onFinish={handleFinishTour}
        onClose={handleFinishTour}
      />

      {/* Modal: Month Filter Selection */}
      <Modal
        visible={historyMonthModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setHistoryMonthModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setHistoryMonthModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Bulan</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              <Pressable
                onPress={() => {
                  setHistoryMonthFilter('all');
                  setHistoryPage(1);
                  setHistoryMonthModalVisible(false);
                }}
                style={[
                  styles.modalOption,
                  historyMonthFilter === 'all' && styles.modalOptionSelected,
                ]}
              >
                <Text style={[
                  styles.modalOptionText,
                  historyMonthFilter === 'all' && styles.modalOptionTextSelected,
                ]}>
                  Semua Bulan
                </Text>
              </Pressable>
              {INDO_MONTHS.map((monthName, index) => {
                const monthValue = String(index + 1).padStart(2, '0');
                return (
                  <Pressable
                    key={monthValue}
                    onPress={() => {
                      setHistoryMonthFilter(monthValue);
                      setHistoryPage(1);
                      setHistoryMonthModalVisible(false);
                    }}
                    style={[
                      styles.modalOption,
                      historyMonthFilter === monthValue && styles.modalOptionSelected,
                    ]}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      historyMonthFilter === monthValue && styles.modalOptionTextSelected,
                    ]}>
                      {monthName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              onPress={() => setHistoryMonthModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseButtonText}>Batal</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Modal: Year Filter Selection */}
      <Modal
        visible={historyYearModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setHistoryYearModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setHistoryYearModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Tahun</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              <Pressable
                onPress={() => {
                  setHistoryYearFilter('all');
                  setHistoryPage(1);
                  setHistoryYearModalVisible(false);
                }}
                style={[
                  styles.modalOption,
                  historyYearFilter === 'all' && styles.modalOptionSelected,
                ]}
              >
                <Text style={[
                  styles.modalOptionText,
                  historyYearFilter === 'all' && styles.modalOptionTextSelected,
                ]}>
                  Semua Tahun
                </Text>
              </Pressable>
              {getAvailableHistoryYears().map((yearValue) => (
                <Pressable
                  key={yearValue}
                  onPress={() => {
                    setHistoryYearFilter(yearValue);
                    setHistoryPage(1);
                    setHistoryYearModalVisible(false);
                  }}
                  style={[
                    styles.modalOption,
                    historyYearFilter === yearValue && styles.modalOptionSelected,
                  ]}
                >
                  <Text style={[
                    styles.modalOptionText,
                    historyYearFilter === yearValue && styles.modalOptionTextSelected,
                  ]}>
                    {yearValue}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setHistoryYearModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseButtonText}>Batal</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  homeWidgetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
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
  scrollContent: {
    paddingHorizontal: theme.spacing.marginMobile,
    paddingTop: 20,
    paddingBottom: 96,
  },

  // Section layout
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#012d1d',
  },

  // Crops Horizontal Scroll Layout
  cropsHorizontalScroll: {
    paddingRight: 16,
    paddingVertical: 4,
    gap: 12,
  },
  cropCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    width: 144,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    height: 124,
    justifyContent: 'space-between',
  },
  cropCardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropCardEmoji: {
    fontSize: 15,
  },
  cropCardName: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#171d14',
    marginTop: 4,
  },
  cropCardLabel: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 10,
    color: '#707a6c',
  },
  cropCardExpense: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.error,
  },
  addCropCard: {
    backgroundColor: '#eff6e7',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#0e6c4a',
    borderStyle: 'dashed',
    width: 144,
    padding: 12,
    height: 124,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCropCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(14, 108, 74, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  addCropCardText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 12,
    color: '#0e6c4a',
    textAlign: 'center',
    fontWeight: '700',
  },

  // Explanation Card
  explanationCard: {
    backgroundColor: '#f5fced', // matches screen bg for nesting contrast
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(14, 108, 74, 0.08)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    marginBottom: 0,
  },
  explanationIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(14, 108, 74, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  explanationText: {
    fontFamily: 'PublicSans-Medium',
    fontSize: 13,
    color: '#40493d',
    lineHeight: 18,
    flex: 1,
  },

  // History section
  historyCard: {
    backgroundColor: '#f5fced', // matches screen bg for nesting contrast
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(14, 108, 74, 0.06)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyCardEmoji: {
    fontSize: 20,
  },
  historyCardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  historyCardName: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#171d14',
  },
  historyCardDate: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 11,
    color: '#707a6c',
    marginTop: 2,
  },
  historyCardProfitContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  historyCardProfit: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyHistoryCard: {
    backgroundColor: '#f5fced',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14, 108, 74, 0.08)',
  },
  emptyHistoryText: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 13,
    color: '#707a6c',
    textAlign: 'center',
  },

  // SUB-PAGE: DETAIL TANAMAN STYLING
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 56,
  },
  detailBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  detailHeaderTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '700',
    flex: 1,
  },
  detailBottomTabBar: {
    backgroundColor: '#012d1d',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  detailBottomTabBarContent: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  detailBottomTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 19,
  },
  detailBottomTabBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  detailBottomTabBtnInactive: {
    backgroundColor: 'transparent',
  },
  detailBottomTabActiveIconContainer: {
    marginRight: 8,
  },
  detailBottomTabBtnText: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 14,
  },
  detailBottomTabBtnTextActive: {
    color: '#cbffc2',
    fontWeight: '700',
  },
  detailBottomTabBtnTextInactive: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    marginLeft: 8,
  },
  detailBannerContainer: {
    flexDirection: 'row',
    backgroundColor: '#012d1d',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
    marginRight: 12,
  },
  detailBannerEmojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailBannerEmoji: {
    fontSize: 22,
  },
  detailBannerTextContainer: {
    flex: 1,
    flexShrink: 1,
    justifyContent: 'center',
  },
  detailBannerCrop: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  detailBannerLahan: {
    fontFamily: 'PublicSans-Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  detailBannerDate: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  detailBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailBannerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailBannerActionBtnDelete: {
    backgroundColor: 'rgba(255, 139, 139, 0.15)',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#012d1d',
    paddingBottom: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#cbffc2',
  },
  tabBtnText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#cbffc2',
  },
  detailScrollContent: {
    paddingHorizontal: theme.spacing.marginMobile,
    paddingTop: 16,
    paddingBottom: 112,
  },

  // Operations inside Detail
  opActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editCycleBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
  },
  editCycleBtnText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  deleteCycleBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderWidth: 1.5,
    borderColor: theme.colors.error,
    borderRadius: theme.rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
  },
  deleteCycleBtnText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    color: theme.colors.error,
    fontWeight: '700',
  },

  // Detail Expenses Tab
  expensesListTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#012d1d',
    marginBottom: 12,
  },
  fastExpenseAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#012d1d',
    height: 44,
    borderRadius: 14,
    gap: 6,
    marginBottom: 16,
  },
  fastExpenseAddBtnText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
  emptyExpensesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  emptyExpensesText: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 13,
    color: '#707a6c',
  },
  expenseItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseItemIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(14, 108, 74, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseItemMiddle: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  expenseItemName: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#171d14',
  },
  expenseItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  expenseItemCategoryText: {
    fontFamily: 'PublicSans-Medium',
    fontSize: 12,
    color: '#0e6c4a',
    backgroundColor: 'rgba(14, 108, 74, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  expenseItemBullet: {
    color: '#707a6c',
    fontSize: 12,
  },
  expenseItemDate: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 12,
    color: '#707a6c',
  },
  expenseItemRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 14,
  },
  expenseItemNominal: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.error,
  },
  expenseItemActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 8,
  },

  // Legacy layout styling
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
    fontSize: 20,
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
  bannerContainer: {
    width: '100%',
    height: 180,
    borderRadius: theme.rounded.xl,
    overflow: 'hidden',
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
  insightCard: {
    backgroundColor: '#23752c',
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
    color: '#e2f0d9',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
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
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  disabledButton: {
    opacity: 0.7,
  },

  // Modal styling
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
    maxHeight: '90%',
  },
  modalTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 16,
  },
  modalSubTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 8,
    marginBottom: 12,
  },
  modalSubdivider: {
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
    marginVertical: 16,
  },
  modalTargetCycleText: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 16,
    fontWeight: '600',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalSaveBtn: {
    flex: 2,
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveBtnText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderWidth: 2,
    borderColor: theme.colors.error,
    borderRadius: theme.rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    color: theme.colors.error,
    fontWeight: '700',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
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
  modalOptionEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  modalOptionText: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 16,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  modalOptionTextSelected: {
    color: theme.colors.onSecondaryContainer,
    fontWeight: '700',
  },
  modalCloseButton: {
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.rounded.lg,
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
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  chartTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#012d1d',
    marginBottom: 8,
  },
  chartSvgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveButton: {
    flexDirection: 'row',
    height: theme.spacing.touchTargetMin,
    backgroundColor: '#ba1a1a',
    borderRadius: theme.rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
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
  historyFiltersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  historyFilterBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5fced', // matches nesting contrast
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(14, 108, 74, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyFilterBtnText: {
    fontFamily: 'PublicSans-Medium',
    fontSize: 13,
    color: '#40493d',
    flex: 1,
    marginRight: 4,
  },
  historyFilterClearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ba1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#ba1a1a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 16,
  },
  paginationBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.5,
  },
  paginationBtnDisabled: {
    backgroundColor: '#f5f7f5',
    borderColor: 'rgba(0,0,0,0.04)',
    elevation: 0,
    shadowOpacity: 0,
    opacity: 0.6,
  },
  paginationText: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 13,
    color: '#40493d',
    minWidth: 110,
    textAlign: 'center',
  },
  sectionHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(14, 108, 74, 0.2)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  sectionHeaderBtnText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 12,
    color: '#0e6c4a',
    fontWeight: '700',
  },
  activeCropsCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  cropCardCustom: {
    backgroundColor: '#f5fced', // matches screen bg for nesting contrast
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(14, 108, 74, 0.08)',
    padding: 12,
    height: 124,
    justifyContent: 'space-between',
  },
  cropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5fced', // matches screen bg for nesting contrast
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(14, 108, 74, 0.06)',
    padding: 12,
    marginBottom: 8,
  },
  cropRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cropRowEmoji: {
    fontSize: 16,
  },
  cropRowInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cropRowName: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#171d14',
  },
  cropRowLabel: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 11,
    color: '#707a6c',
    marginTop: 2,
  },
  cropRowExpenseContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  cropRowExpenseLabel: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 10,
    color: '#707a6c',
  },
  cropRowExpenseValue: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#0e6c4a',
    marginTop: 1,
  },
  emptyCropsCard: {
    backgroundColor: '#f5fced',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14, 108, 74, 0.08)',
  },
  emptyCropsText: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 13,
    color: '#707a6c',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyCropsBtn: {
    backgroundColor: '#0e6c4a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#0e6c4a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  emptyCropsBtnText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
  cropSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  cropGridItem: {
    width: '23%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropGridItemSelected: {
    backgroundColor: theme.colors.secondaryContainer,
    borderColor: theme.colors.secondary,
  },
  cropGridItemEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  cropGridItemText: {
    fontFamily: 'PublicSans-Medium',
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  cropGridItemTextSelected: {
    fontFamily: 'PublicSans-Bold',
    color: theme.colors.onSecondaryContainer,
    fontWeight: '700',
  },
  modalFieldLabel: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 4,
    marginTop: 8,
  },
  modalErrorText: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 13,
    color: theme.colors.error,
    marginTop: 4,
    fontWeight: '400',
  },
  expenseItemActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  expenseActionBtnEdit: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(14, 108, 74, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseActionBtnDelete: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BerandaScreen;
