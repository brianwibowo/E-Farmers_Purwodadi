import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Modal, FlatList } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '../theme';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const CalendarModal = ({ visible, value, onSelect, onClose }) => {
  // Parse initial date
  const getInitialDate = () => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m - 1, d);
      }
    }
    return new Date();
  };

  const initialDate = getInitialDate();
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [selectedDateStr, setSelectedDateStr] = useState(value);

  // Sync selectedDateStr and visible month when value changes or modal becomes visible
  useEffect(() => {
    if (visible) {
      const date = getInitialDate();
      setCurrentMonth(date.getMonth());
      setCurrentYear(date.getFullYear());
      setSelectedDateStr(value);
    }
  }, [visible, value]);

  // Days in month calculation
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // First day of month index (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDayIndex = getFirstDayOfMonth(currentMonth, currentYear);

  // Build days array (padding at start for alignment)
  const calendarCells = [];
  
  // Padding cells
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ key: `empty-${i}`, isPadding: true });
  }

  // Active days cells
  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = String(currentMonth + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    const dateStr = `${currentYear}-${mStr}-${dStr}`;
    calendarCells.push({
      key: `day-${d}`,
      dayNum: d,
      dateStr,
      isPadding: false,
    });
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const renderCell = ({ item }) => {
    if (item.isPadding) {
      return <View style={styles.cellEmpty} />;
    }

    const isSelected = item.dateStr === selectedDateStr;
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = item.dateStr === todayStr;

    return (
      <Pressable
        onPress={() => {
          setSelectedDateStr(item.dateStr);
          onSelect(item.dateStr);
          onClose();
        }}
        style={[
          styles.cellDay,
          isToday && styles.cellToday,
          isSelected && styles.cellSelected,
        ]}
      >
        <Text style={[
          styles.cellText,
          isToday && styles.cellTodayText,
          isSelected && styles.cellSelectedText,
        ]}>
          {item.dayNum}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handlePrevMonth} style={styles.navButton}>
              <MaterialIcons name="chevron-left" size={24} color={theme.colors.primary} />
            </Pressable>
            <Text style={styles.headerTitle}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <Pressable onPress={handleNextMonth} style={styles.navButton}>
              <MaterialIcons name="chevron-right" size={24} color={theme.colors.primary} />
            </Pressable>
          </View>

          {/* Weekday Names */}
          <View style={styles.weekdaysRow}>
            {DAY_NAMES.map((day, index) => (
              <Text key={index} style={styles.weekdayText}>
                {day}
              </Text>
            ))}
          </View>

          {/* Grid of Days */}
          <FlatList
            data={calendarCells}
            renderItem={renderCell}
            numColumns={7}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.gridContainer}
            scrollEnabled={false}
          />

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable
              onPress={() => {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const todayStr = `${year}-${month}-${day}`;
                onSelect(todayStr);
                onClose();
              }}
              style={styles.todayButton}
            >
              <Text style={styles.todayButtonText}>Hari Ini</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Batal</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.rounded.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(1, 45, 29, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
    paddingBottom: 6,
  },
  weekdayText: {
    width: 40,
    textAlign: 'center',
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
  gridContainer: {
    alignItems: 'center',
  },
  cellEmpty: {
    width: 40,
    height: 40,
    margin: 2,
  },
  cellDay: {
    width: 40,
    height: 40,
    margin: 2,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontFamily: 'PublicSans-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  cellTodayText: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  cellSelected: {
    backgroundColor: theme.colors.primary,
  },
  cellSelectedText: {
    fontFamily: 'PublicSans-Bold',
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
    paddingTop: 12,
  },
  todayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(1, 45, 29, 0.05)',
  },
  todayButtonText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  closeButtonText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.error,
  },
});

export default CalendarModal;
