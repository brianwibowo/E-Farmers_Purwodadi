import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { theme } from '../theme';
import { getCategoryById } from '../utils/categories';
import { formatRupiah } from '../utils/calculations';
import { CategoryIcon } from './CategoryIcon';

export const ExpenseListItem = ({ expense, onPress }) => {
  const { nama_pengeluaran, kategori, nominal } = expense;

  const categoryInfo = getCategoryById(kategori);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.leftSection}>
        <CategoryIcon categoryId={kategori} size={48} />
      </View>

      <View style={styles.middleSection}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {nama_pengeluaran}
        </Text>
        <Text style={styles.subtitle}>
          {categoryInfo.label}
          {expense.keterangan_lainnya ? ` — ${expense.keterangan_lainnya}` : ''}
          {(expense.cycleName || expense.komoditas) ? ` • ${expense.cycleName || expense.komoditas}${expense.is_archived ? ' (Arsip)' : ''}` : ''}
        </Text>
      </View>

      <View style={styles.rightSection}>
        <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.8}>
          {formatRupiah(nominal)}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 80,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  pressed: {
    backgroundColor: theme.colors.surfaceContainerLow,
    transform: [{ scale: 0.99 }],
  },
  leftSection: {
    marginRight: 14,
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 3,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '400',
  },
  rightSection: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    maxWidth: '35%',
  },
  amount: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
    lineHeight: 22,
  },
});

export default ExpenseListItem;
