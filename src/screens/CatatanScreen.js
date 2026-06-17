import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SectionList,
  Pressable,
  Modal,
  ActivityIndicator,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FeatureTour from '../components/FeatureTour';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { theme } from '../theme';
import { useAuth } from '../utils/AuthContext';
import { getExpenses, getPanen } from '../utils/storage';
import { calculateTotalPengeluaran, calculateEstimasiPendapatan, formatRupiah } from '../utils/calculations';
import { categories } from '../utils/categories';
import ExpenseListItem from '../components/ExpenseListItem';
import InputField from '../components/InputField';
import FAB from '../components/FAB';


// ── Helpers ──

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_NAMES_INDONESIAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAY_NAMES_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const formatSectionDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = DAY_NAMES_SHORT[date.getDay()];
  return `${dayName}, ${d}/${m}/${y}`;
};

const groupByDate = (expenses) => {
  const sorted = [...expenses].sort((a, b) => {
    if (a.tanggal > b.tanggal) return -1;
    if (a.tanggal < b.tanggal) return 1;
    return 0;
  });

  const groups = {};
  sorted.forEach((exp) => {
    const key = exp.tanggal || 'Tanpa Tanggal';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(exp);
  });

  return Object.keys(groups).map((dateKey) => ({
    title: formatSectionDate(dateKey),
    dateKey,
    subtotal: groups[dateKey].reduce((sum, e) => sum + (e.nominal || 0), 0),
    data: groups[dateKey],
  }));
};

const filterByPeriod = (expenses, period, customMonth, customYear) => {
  if (period === 'all') return expenses;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return expenses.filter((exp) => {
    if (!exp.tanggal) return false;
    const [y, m] = exp.tanggal.split('-').map(Number);
    const expMonth = m - 1; // 0-indexed
    const expYear = y;

    switch (period) {
      case 'this_month':
        return expMonth === currentMonth && expYear === currentYear;
      case 'last_month': {
        const lastM = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastY = currentMonth === 0 ? currentYear - 1 : currentYear;
        return expMonth === lastM && expYear === lastY;
      }
      case '3_months': {
        const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1);
        const expDate = new Date(expYear, expMonth, 1);
        return expDate >= threeMonthsAgo;
      }
      case 'this_year':
        return expYear === currentYear;
      case 'custom':
        return expMonth === customMonth && expYear === customYear;
      default:
        return true;
    }
  });
};

const getPeriodForMonthYear = (month, year) => {
  const now = new Date();
  const currentM = now.getMonth();
  const currentY = now.getFullYear();
  const lastM = currentM === 0 ? 11 : currentM - 1;
  const lastY = currentM === 0 ? currentY - 1 : currentY;

  if (month === currentM && year === currentY) {
    return 'this_month';
  } else if (month === lastM && year === lastY) {
    return 'last_month';
  }
  return 'custom';
};

const PERIOD_OPTIONS = [
  { id: 'all', label: 'Semua Data', icon: 'list' },
  { id: 'this_month', label: 'Bulan Ini', icon: 'today' },
  { id: 'last_month', label: 'Bulan Lalu', icon: 'event' },
  { id: '3_months', label: '3 Bulan Terakhir', icon: 'date-range' },
  { id: 'this_year', label: 'Tahun Ini', icon: 'calendar-today' },
];

// ── Component ──

export const CatatanScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [allExpenses, setAllExpenses] = useState([]);
  const [panen, setPanen] = useState({ komoditas: '', estimasi_hasil_kg: '', harga_jual_per_kg: '' });
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customMonth, setCustomMonth] = useState(new Date().getMonth());
  const [customYear, setCustomYear] = useState(new Date().getFullYear());
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Collapsed sections state
  const [collapsedSections, setCollapsedSections] = useState({});

  // Tour Refs & State
  const filterCardRef = useRef(null);
  const periodFilterRef = useRef(null);
  const searchToggleRef = useRef(null);
  const fabRef = useRef(null);
  const [tourVisible, setTourVisible] = useState(false);

  // Trigger tour if user hasn't seen Catatan tour
  useEffect(() => {
    const checkTour = async () => {
      try {
        const catatanSeen = await AsyncStorage.getItem('HAS_SEEN_CATATAN_TOUR');
        if (catatanSeen !== 'true') {
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
      await AsyncStorage.setItem('HAS_SEEN_CATATAN_TOUR', 'true');
      setTourVisible(false);
    } catch (err) {
      console.error(err);
      setTourVisible(false);
    }
  };

  const tourSteps = [
    {
      title: 'Laporan Ringkasan Kas',
      description: 'Gunakan kartu ini untuk memantau ringkasan total untung, pendapatan, dan pengeluaran pertanian Anda secara cepat.',
      ref: filterCardRef,
      popoverPosition: 'bottom', // Force position to safe lower screen area
    },
    {
      title: 'Penyaringan Periode & Kategori',
      description: 'Ketuk nama bulan di tengah untuk memilih bulan custom, atau gunakan tombol panah kiri-kanan untuk bergeser bulan. Ketuk tombol filter (corong di kanan) untuk menyaring pengeluaran berdasarkan kategori tertentu (misalnya: pupuk, benih, dll).',
      ref: periodFilterRef,
      popoverPosition: 'bottom', // Force position to safe lower screen area
    },
    {
      title: 'Pencarian Transaksi',
      description: 'Ketuk ikon pencarian ini untuk menyaring pengeluaran secara cepat berdasarkan nama transaksi secara real-time.',
      ref: searchToggleRef,
    },
    {
      title: 'Tambah Pengeluaran',
      description: 'Ketuk tombol tambah pengeluaran ini untuk mencatat transaksi pengeluaran operasional baru dalam bentuk batch sekaligus.',
      ref: fabRef,
    },
  ];

  // Temp states for modal (apply on confirm)
  const [tempPeriod, setTempPeriod] = useState('this_month');
  const [tempCategory, setTempCategory] = useState('all');
  const [tempMonth, setTempMonth] = useState(new Date().getMonth());
  const [tempYear, setTempYear] = useState(new Date().getFullYear());

  const toggleSectionCollapse = (dateKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedSections((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const applyAllFilters = (expenses, period, category, cMonth, cYear, query = searchQuery) => {
    let result = [...expenses];

    // Period filter
    result = filterByPeriod(result, period, cMonth, cYear);

    // Category filter
    if (category !== 'all') {
      result = result.filter((item) => item.kategori === category);
    }

    // Search query filter
    if (query && query.trim() !== '') {
      const q = query.toLowerCase().trim();
      result = result.filter((item) => 
        (item.nama_pengeluaran && item.nama_pengeluaran.toLowerCase().includes(q)) ||
        (item.kategori && item.kategori.toLowerCase().includes(q))
      );
    }

    const grouped = groupByDate(result);
    setSections(grouped);
  };

  // Load data
  const loadExpenses = async () => {
    setLoading(true);
    try {
      const loaded = await getExpenses();
      const loadedPanen = await getPanen();
      setAllExpenses(loaded);
      if (loadedPanen) {
        setPanen(loadedPanen);
      }
      applyAllFilters(loaded, selectedPeriod, selectedCategory, customMonth, customYear, searchQuery);
    } catch (err) {
      console.error('Error loading expenses', err);
    } finally {
      setLoading(false);
    }
  };

  const PERIODS = ['all', 'this_month', 'last_month', '3_months', 'this_year'];

  const handlePrevPeriod = () => {
    const now = new Date();
    
    if (selectedPeriod === 'this_month') {
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevM = prevDate.getMonth();
      const prevY = prevDate.getFullYear();
      setCustomMonth(prevM);
      setCustomYear(prevY);
      setSelectedPeriod('last_month');
      applyAllFilters(allExpenses, 'last_month', selectedCategory, prevM, prevY, searchQuery);
    } 
    else if (selectedPeriod === 'last_month') {
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const prevM = prevDate.getMonth();
      const prevY = prevDate.getFullYear();
      setCustomMonth(prevM);
      setCustomYear(prevY);
      setSelectedPeriod('custom');
      applyAllFilters(allExpenses, 'custom', selectedCategory, prevM, prevY, searchQuery);
    } 
    else if (selectedPeriod === 'custom') {
      let newMonth = customMonth - 1;
      let newYear = customYear;
      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      }
      setCustomMonth(newMonth);
      setCustomYear(newYear);
      
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      let targetPeriod = 'custom';
      if (newMonth === currentMonth && newYear === currentYear) {
        targetPeriod = 'this_month';
      } else if (newMonth === lastMonth && newYear === lastYear) {
        targetPeriod = 'last_month';
      }
      
      setSelectedPeriod(targetPeriod);
      applyAllFilters(allExpenses, targetPeriod, selectedCategory, newMonth, newYear, searchQuery);
    } 
    else if (selectedPeriod === 'this_year') {
      const currentM = now.getMonth();
      const prevY = now.getFullYear() - 1;
      setCustomMonth(currentM);
      setCustomYear(prevY);
      setSelectedPeriod('custom');
      applyAllFilters(allExpenses, 'custom', selectedCategory, currentM, prevY, searchQuery);
    }
    else {
      const currentM = now.getMonth();
      const currentY = now.getFullYear();
      setCustomMonth(currentM);
      setCustomYear(currentY);
      setSelectedPeriod('this_month');
      applyAllFilters(allExpenses, 'this_month', selectedCategory, currentM, currentY, searchQuery);
    }
  };

  const handleNextPeriod = () => {
    const now = new Date();
    
    if (selectedPeriod === 'this_month') {
      const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextM = nextDate.getMonth();
      const nextY = nextDate.getFullYear();
      setCustomMonth(nextM);
      setCustomYear(nextY);
      setSelectedPeriod('custom');
      applyAllFilters(allExpenses, 'custom', selectedCategory, nextM, nextY, searchQuery);
    } 
    else if (selectedPeriod === 'last_month') {
      const nextM = now.getMonth();
      const nextY = now.getFullYear();
      setCustomMonth(nextM);
      setCustomYear(nextY);
      setSelectedPeriod('this_month');
      applyAllFilters(allExpenses, 'this_month', selectedCategory, nextM, nextY, searchQuery);
    } 
    else if (selectedPeriod === 'custom') {
      let newMonth = customMonth + 1;
      let newYear = customYear;
      if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }
      setCustomMonth(newMonth);
      setCustomYear(newYear);
      
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      let targetPeriod = 'custom';
      if (newMonth === currentMonth && newYear === currentYear) {
        targetPeriod = 'this_month';
      } else if (newMonth === lastMonth && newYear === lastYear) {
        targetPeriod = 'last_month';
      }
      
      setSelectedPeriod(targetPeriod);
      applyAllFilters(allExpenses, targetPeriod, selectedCategory, newMonth, newYear, searchQuery);
    } 
    else if (selectedPeriod === 'this_year') {
      const currentM = now.getMonth();
      const nextY = now.getFullYear() + 1;
      setCustomMonth(currentM);
      setCustomYear(nextY);
      setSelectedPeriod('custom');
      applyAllFilters(allExpenses, 'custom', selectedCategory, currentM, nextY, searchQuery);
    }
    else {
      const currentM = now.getMonth();
      const currentY = now.getFullYear();
      setCustomMonth(currentM);
      setCustomYear(currentY);
      setSelectedPeriod('this_month');
      applyAllFilters(allExpenses, 'this_month', selectedCategory, currentM, currentY, searchQuery);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyAllFilters(allExpenses, selectedPeriod, selectedCategory, customMonth, customYear, text);
  };

  const toggleSearch = () => {
    if (isSearchVisible) {
      setSearchQuery('');
      applyAllFilters(allExpenses, selectedPeriod, selectedCategory, customMonth, customYear, '');
    }
    setIsSearchVisible(!isSearchVisible);
  };

  useFocusEffect(
    useCallback(() => {
      setSelectedPeriod('this_month');
      setSelectedCategory('all');
      setCustomMonth(new Date().getMonth());
      setCustomYear(new Date().getFullYear());
      setSearchQuery('');
      setIsSearchVisible(false);
      
      const initLoad = async () => {
        setLoading(true);
        try {
          const loaded = await getExpenses();
          const loadedPanen = await getPanen();
          setAllExpenses(loaded);
          if (loadedPanen) {
            setPanen(loadedPanen);
          }
          applyAllFilters(loaded, 'this_month', 'all', new Date().getMonth(), new Date().getFullYear(), '');
        } catch (err) {
          console.error('Error loading expenses', err);
        } finally {
          setLoading(false);
        }
      };
      
      initLoad();
    }, [])
  );

  const openFilterModal = () => {
    setTempPeriod(selectedPeriod);
    setTempCategory(selectedCategory);
    setTempMonth(customMonth);
    setTempYear(customYear);
    setFilterModalVisible(true);
  };

  const applyFilter = () => {
    const targetPeriod = (tempPeriod === 'custom' || tempPeriod === 'this_month' || tempPeriod === 'last_month')
      ? getPeriodForMonthYear(tempMonth, tempYear)
      : tempPeriod;

    setSelectedPeriod(targetPeriod);
    setSelectedCategory(tempCategory);
    setCustomMonth(tempMonth);
    setCustomYear(tempYear);
    setFilterModalVisible(false);
    applyAllFilters(allExpenses, targetPeriod, tempCategory, tempMonth, tempYear, searchQuery);
  };

  // Total pengeluaran for the currently visible data
  const visibleExpenses = sections.reduce((arr, s) => arr.concat(s.data), []);
  const totalFiltered = calculateTotalPengeluaran(visibleExpenses);
  
  const estimasiPendapatan = calculateEstimasiPendapatan(panen);
  const estimasiUntung = estimasiPendapatan - totalFiltered;

  const isFilterActive = (() => {
    const now = new Date();
    const currentM = now.getMonth();
    const currentY = now.getFullYear();
    
    if (selectedCategory !== 'all') return true;
    if (selectedPeriod === 'this_month') return false;
    if (selectedPeriod === 'custom' && customMonth === currentM && customYear === currentY) return false;
    return true;
  })();

  // Get active period label when category is not the main focus
  const getActivePeriodLabel = () => {
    const now = new Date();
    if (selectedPeriod === 'this_month') {
      return `${MONTH_NAMES_INDONESIAN[now.getMonth()]} ${now.getFullYear()}`;
    }
    if (selectedPeriod === 'last_month') {
      const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `${MONTH_NAMES_INDONESIAN[last.getMonth()]} ${last.getFullYear()}`;
    }
    if (selectedPeriod === 'custom') {
      return `${MONTH_NAMES_INDONESIAN[customMonth]} ${customYear}`;
    }
    const opt = PERIOD_OPTIONS.find((o) => o.id === selectedPeriod);
    return opt ? opt.label : 'Semua Data';
  };

  // Get label for active filter badge
  const getFilterLabel = () => {
    const parts = [];
    if (selectedPeriod !== 'all') {
      if (selectedPeriod === 'this_month') {
        const now = new Date();
        parts.push(`${MONTH_NAMES_INDONESIAN[now.getMonth()]} ${now.getFullYear()}`);
      } else if (selectedPeriod === 'last_month') {
        const now = new Date();
        const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        parts.push(`${MONTH_NAMES_INDONESIAN[last.getMonth()]} ${last.getFullYear()}`);
      } else if (selectedPeriod === 'custom') {
        parts.push(`${MONTH_NAMES_INDONESIAN[customMonth]} ${customYear}`);
      } else {
        const opt = PERIOD_OPTIONS.find((o) => o.id === selectedPeriod);
        if (opt) parts.push(opt.label);
      }
    }
    if (selectedCategory !== 'all') {
      const cat = categories.find((c) => c.id === selectedCategory);
      if (cat) parts.push(cat.label);
    }
    return parts.join(' • ');
  };

  // Helper for formatting rupiah with a dot prefix e.g. "Rp. 1.700.000"
  const formatRupiahWithDot = (value) => {
    if (value === undefined || value === null || isNaN(value)) {
      return 'Rp. 0';
    }
    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
    
    if (value < 0) {
      return `-Rp. ${formatted.replace('-', '')}`;
    }
    return `Rp. ${formatted}`;
  };

  // ── Section Header (Collapsible) ──
  const renderSectionHeader = ({ section }) => {
    const isCollapsed = !!collapsedSections[section.dateKey];
    return (
      <Pressable 
        onPress={() => toggleSectionCollapse(section.dateKey)}
        style={({ pressed }) => [styles.sectionHeader, pressed && styles.pressed]}
      >
        <View style={styles.sectionHeaderLeft}>
          <MaterialIcons 
            name={isCollapsed ? "arrow-drop-up" : "arrow-drop-down"} 
            size={24} 
            color={theme.colors.error} 
            style={styles.collapseIcon}
          />
          <Text style={styles.sectionHeaderText}>{section.title}</Text>
        </View>
        <Text style={styles.sectionHeaderSubtotal}>
          Pengeluaran: {formatRupiahWithDot(section.subtotal)}
        </Text>
      </Pressable>
    );
  };

  const getWaktuTahunLabel = () => {
    const now = new Date();
    if (selectedPeriod === 'this_month') {
      return `${MONTH_NAMES_INDONESIAN[now.getMonth()]} ${now.getFullYear()}`;
    }
    if (selectedPeriod === 'last_month') {
      const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `${MONTH_NAMES_INDONESIAN[last.getMonth()]} ${last.getFullYear()}`;
    }
    if (selectedPeriod === 'custom') {
      return `${MONTH_NAMES_INDONESIAN[customMonth]} ${customYear}`;
    }
    if (selectedPeriod === 'this_year') {
      return `${now.getFullYear()}`;
    }
    if (selectedPeriod === '3_months') {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return `${MONTH_NAMES_SHORT[start.getMonth()]} - ${MONTH_NAMES_SHORT[now.getMonth()]} ${now.getFullYear()}`;
    }
    const opt = PERIOD_OPTIONS.find((o) => o.id === selectedPeriod);
    return opt ? opt.label : 'Semua Data';
  };

  // ── List Header ──
  const renderListHeader = () => (
    <View ref={filterCardRef} style={styles.cardContainer}>
      <View style={styles.combinedFilterCard}>
        {/* Top Section: Period Control Selector and Tune/Reset Button */}
        <View ref={periodFilterRef} style={styles.cardHeader}>
          {/* Left Icon Badge (Search Toggle) */}
          <Pressable 
            ref={searchToggleRef}
            onPress={toggleSearch}
            style={({ pressed }) => [
              styles.cardIconBadge, 
              isSearchVisible && styles.cardIconBadgeActive,
              pressed && styles.pressed
            ]}
          >
            <MaterialIcons 
              name={isSearchVisible ? "close" : "search"} 
              size={24} 
              color={isSearchVisible ? theme.colors.onSecondaryContainer : theme.colors.primary} 
            />
          </Pressable>
          <View style={styles.periodSelectorContainer}>
            <Pressable 
              onPress={handlePrevPeriod} 
              style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
            >
              <MaterialIcons name="chevron-left" size={26} color={theme.colors.primary} />
            </Pressable>
            <Pressable 
              onPress={openFilterModal} 
              style={({ pressed }) => [styles.periodLabelPressable, pressed && styles.pressed]}
            >
              <Text style={styles.periodLabelText}>{getFilterLabel() || getActivePeriodLabel()}</Text>
              <MaterialIcons name="arrow-drop-down" size={18} color={theme.colors.outline} />
            </Pressable>
            <Pressable 
              onPress={handleNextPeriod} 
              style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
            >
              <MaterialIcons name="chevron-right" size={26} color={theme.colors.primary} />
            </Pressable>
          </View>

          {/* Right: Actions (Tune / Reset) */}
          <View style={styles.cardHeaderActions}>
            <Pressable
              onPress={openFilterModal}
              style={({ pressed }) => [
                styles.actionIconBadge,
                selectedCategory !== 'all' && styles.actionIconBadgeActive,
                pressed && styles.pressed,
              ]}
            >
              <MaterialIcons 
                name="tune" 
                size={22} 
                color={selectedCategory !== 'all' ? theme.colors.onSecondaryContainer : theme.colors.primary} 
              />
            </Pressable>
            {isFilterActive || searchQuery !== '' ? (
              <Pressable
                onPress={() => {
                  setSelectedPeriod('this_month');
                  setSelectedCategory('all');
                  setSearchQuery('');
                  applyAllFilters(allExpenses, 'this_month', 'all', new Date().getMonth(), new Date().getFullYear(), '');
                }}
                style={({ pressed }) => [
                  styles.actionIconBadge,
                  styles.actionIconBadgeReset,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialIcons name="refresh" size={22} color={theme.colors.error} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Search Input Field (when toggled on) */}
        {isSearchVisible && (
          <View style={styles.searchBarWrapper}>
            <InputField
              placeholder="Cari nama pengeluaran..."
              value={searchQuery}
              onChangeText={handleSearch}
              icon="search"
              containerStyle={styles.searchFieldContainer}
              autoFocus={true}
            />
          </View>
        )}

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Bottom Section: Total Pengeluaran */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            Total Pengeluaran {getWaktuTahunLabel()}:
          </Text>
          <Text style={styles.totalValue}>
            {formatRupiahWithDot(totalFiltered)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
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
            <Text style={styles.headerText}>E-Farmers</Text>
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
            onPress={() => navigation.navigate('TambahCatatan')}
            style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
          >
            <MaterialIcons name="add" size={28} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={true}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={renderListHeader()}
          renderItem={({ item, section }) => {
            if (collapsedSections[section.dateKey]) {
              return null;
            }
            return (
              <ExpenseListItem
                expense={item}
                onPress={() => navigation.navigate('EditCatatan', { expenseId: item.id })}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt" size={64} color={theme.colors.outline} style={styles.emptyIcon} />
              <Text style={styles.emptyTextTitle}>Belum Ada Catatan</Text>
              <Text style={styles.emptyTextSub}>
                {isFilterActive
                  ? 'Tidak ada hasil yang cocok. Coba ubah penyaringan.'
                  : 'Mulai catat pengeluaran tani Anda dengan menekan tombol + di kanan atas.'}
              </Text>
            </View>
          }
        />
      )}

      <FAB ref={fabRef} onPress={() => navigation.navigate('TambahCatatan')} />

      <FeatureTour
        visible={tourVisible}
        steps={tourSteps}
        onFinish={handleFinishTour}
        onClose={handleFinishTour}
      />

      {/* ── Filter Modal ── */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={() => { }}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* ── Section: Periode ── */}
              <Text style={styles.modalSectionLabel}>Periode Waktu</Text>

              {PERIOD_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    setTempPeriod(opt.id);
                    const now = new Date();
                    if (opt.id === 'this_month') {
                      setTempMonth(now.getMonth());
                      setTempYear(now.getFullYear());
                    } else if (opt.id === 'last_month') {
                      const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                      setTempMonth(last.getMonth());
                      setTempYear(last.getFullYear());
                    }
                  }}
                  style={[
                    styles.modalOption,
                    tempPeriod === opt.id && styles.modalOptionSelected,
                  ]}
                >
                  <MaterialIcons
                    name={opt.icon}
                    size={22}
                    color={tempPeriod === opt.id ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    style={styles.modalOptionIcon}
                  />
                  <Text
                    style={[
                      styles.modalOptionText,
                      tempPeriod === opt.id && styles.modalOptionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {tempPeriod === opt.id ? (
                    <MaterialIcons name="check-circle" size={22} color={theme.colors.primary} />
                  ) : null}
                </Pressable>
              ))}

              {/* ── Section: Custom Month Picker ── */}
              <View style={styles.modalDivider} />
              <Text style={styles.modalSectionLabel}>Pilih Bulan Tertentu</Text>

              {/* Year Selector */}
              <View style={styles.yearSelector}>
                <Pressable
                  onPress={() => setTempYear((y) => {
                    const nextY = y - 1;
                    if (tempPeriod === 'this_month' || tempPeriod === 'last_month' || tempPeriod === 'custom') {
                      setTempPeriod(getPeriodForMonthYear(tempMonth, nextY));
                    }
                    return nextY;
                  })}
                  style={({ pressed }) => [styles.yearArrow, pressed && styles.pressed]}
                >
                  <MaterialIcons name="chevron-left" size={28} color={theme.colors.primary} />
                </Pressable>
                <Text style={styles.yearText}>{tempYear}</Text>
                <Pressable
                  onPress={() => setTempYear((y) => {
                    const nextY = y + 1;
                    if (tempPeriod === 'this_month' || tempPeriod === 'last_month' || tempPeriod === 'custom') {
                      setTempPeriod(getPeriodForMonthYear(tempMonth, nextY));
                    }
                    return nextY;
                  })}
                  style={({ pressed }) => [styles.yearArrow, pressed && styles.pressed]}
                >
                  <MaterialIcons name="chevron-right" size={28} color={theme.colors.primary} />
                </Pressable>
              </View>

              {/* Month Grid (4 cols × 3 rows) */}
              <View style={styles.monthGrid}>
                {MONTH_NAMES_SHORT.map((name, idx) => {
                  const isSingleMonth = tempPeriod === 'this_month' || tempPeriod === 'last_month' || tempPeriod === 'custom';
                  const isActive = isSingleMonth && tempMonth === idx;
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => {
                        setTempMonth(idx);
                        setTempPeriod(getPeriodForMonthYear(idx, tempYear));
                      }}
                      style={[
                        styles.monthCell,
                        isActive && styles.monthCellActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthCellText,
                          isActive && styles.monthCellTextActive,
                        ]}
                      >
                        {name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* ── Section: Kategori ── */}
              <View style={styles.modalDivider} />
              <Text style={styles.modalSectionLabel}>Kategori</Text>

              <Pressable
                onPress={() => setTempCategory('all')}
                style={[
                  styles.modalOption,
                  tempCategory === 'all' && styles.modalOptionSelected,
                ]}
              >
                <MaterialIcons
                  name="list"
                  size={22}
                  color={tempCategory === 'all' ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  style={styles.modalOptionIcon}
                />
                <Text
                  style={[
                    styles.modalOptionText,
                    tempCategory === 'all' && styles.modalOptionTextSelected,
                  ]}
                >
                  Semua Kategori
                </Text>
                {tempCategory === 'all' ? (
                  <MaterialIcons name="check-circle" size={22} color={theme.colors.primary} />
                ) : null}
              </Pressable>

              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setTempCategory(cat.id)}
                  style={[
                    styles.modalOption,
                    tempCategory === cat.id && styles.modalOptionSelected,
                  ]}
                >
                  <MaterialIcons
                    name={cat.icon}
                    size={22}
                    color={tempCategory === cat.id ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    style={styles.modalOptionIcon}
                  />
                  <Text
                    style={[
                      styles.modalOptionText,
                      tempCategory === cat.id && styles.modalOptionTextSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                  {tempCategory === cat.id ? (
                    <MaterialIcons name="check-circle" size={22} color={theme.colors.primary} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>

            {/* Apply & Close Buttons */}
            <View style={styles.modalActions}>
              <Pressable
                onPress={applyFilter}
                style={({ pressed }) => [styles.modalApplyButton, pressed && styles.modalApplyButtonPressed]}
              >
                <MaterialIcons name="check" size={22} color={theme.colors.onPrimary} />
                <Text style={styles.modalApplyText}>Terapkan Filter</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  const now = new Date();
                  setTempPeriod('this_month');
                  setTempCategory('all');
                  setTempMonth(now.getMonth());
                  setTempYear(now.getFullYear());
                }}
                style={({ pressed }) => [styles.modalResetButton, pressed && styles.pressed]}
              >
                <Text style={styles.modalResetText}>Reset Semua</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  // Premium Custom White Header with Rounded Bottom
  header: {
    backgroundColor: '#012d1d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.marginMobile,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: theme.spacing.marginMobile,
    paddingTop: 10,
    paddingBottom: 180,
  },
  cardContainer: {
    marginBottom: 8,
  },
  combinedFilterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(1, 45, 29, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodSelectorContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  periodLabelPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  periodLabelText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    marginRight: 2,
    textAlign: 'center',
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(1, 45, 29, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconBadgeActive: {
    backgroundColor: theme.colors.secondaryContainer,
  },
  actionIconBadgeReset: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginVertical: 8,
  },
  cardIconBadgeActive: {
    backgroundColor: theme.colors.secondaryContainer,
  },
  searchBarWrapper: {
    marginTop: 10,
    marginBottom: 4,
    width: '100%',
  },
  searchFieldContainer: {
    marginBottom: 0,
  },
  totalRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  totalLabel: {
    fontFamily: 'PublicSans-Medium',
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
    opacity: 0.8,
  },
  totalValue: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 22,
    color: theme.colors.error,
    fontWeight: '800',
  },
  collapseIcon: {
    marginRight: 2,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerHighest,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
    borderRadius: theme.rounded.default,
    borderWidth: 1,
    borderColor: 'rgba(1, 45, 29, 0.08)',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderText: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
    marginLeft: 6,
  },
  sectionHeaderSubtotal: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTextTitle: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 20,
    color: theme.colors.onSurface,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyTextSub: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.rounded.xl,
    borderTopRightRadius: theme.rounded.xl,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalSectionLabel: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 12,
    marginTop: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 14,
    borderRadius: theme.rounded.default,
    marginBottom: 6,
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
    flex: 1,
    fontFamily: 'PublicSans-Regular',
    fontSize: 15,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    fontFamily: 'PublicSans-SemiBold',
    color: theme.colors.onSecondaryContainer,
    fontWeight: '700',
  },
  modalDivider: {
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
    marginVertical: 20,
  },
  // Year Selector
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  yearArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginHorizontal: 24,
  },
  // Month Grid
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthCell: {
    width: '23%',
    height: 42,
    borderRadius: theme.rounded.default,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  monthCellActive: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primary,
  },
  monthCellText: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
  monthCellTextActive: {
    color: theme.colors.onPrimaryContainer,
    fontWeight: '700',
  },
  // Modal Actions
  modalActions: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
    paddingTop: 16,
  },
  modalApplyButton: {
    flexDirection: 'row',
    height: theme.spacing.touchTargetMin,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalApplyButtonPressed: {
    backgroundColor: theme.colors.primaryContainer,
    transform: [{ scale: 0.98 }],
  },
  modalApplyText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.onPrimary,
    marginLeft: 8,
  },
  modalResetButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  modalResetText: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
});

export default CatatanScreen;
