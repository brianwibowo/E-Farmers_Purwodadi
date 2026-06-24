import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPENSES_KEY = '@efarmers:expenses';
const PANEN_KEY = '@efarmers:panen';
const ARCHIVED_CYCLES_KEY = '@efarmers:archived_cycles';
const CYCLES_KEY = '@efarmers:cycles';

// Helper to generate unique ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

export const getExpenses = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(EXPENSES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Error reading expenses from storage', e);
    return [];
  }
};

export const saveExpenses = async (expenses) => {
  try {
    const jsonValue = JSON.stringify(expenses);
    await AsyncStorage.setItem(EXPENSES_KEY, jsonValue);
  } catch (e) {
    console.error('Error saving expenses to storage', e);
  }
};

export const addExpense = async (expense) => {
  try {
    const expenses = await getExpenses();
    const newExpense = {
      id: generateId(),
      is_archived: false,
      siklusId: expense.siklusId || null,
      ...expense,
      nominal: parseFloat(expense.nominal) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expenses.unshift(newExpense); // Put newest first
    await saveExpenses(expenses);
    return newExpense;
  } catch (e) {
    console.error('Error adding expense', e);
    throw e;
  }
};

export const updateExpense = async (id, updatedFields) => {
  try {
    const expenses = await getExpenses();
    const index = expenses.findIndex(item => item.id === id);
    if (index === -1) throw new Error('Expense not found');

    expenses[index] = {
      ...expenses[index],
      ...updatedFields,
      nominal: parseFloat(updatedFields.nominal) || 0,
      updated_at: new Date().toISOString(),
    };
    
    await saveExpenses(expenses);
    return expenses[index];
  } catch (e) {
    console.error('Error updating expense', e);
    throw e;
  }
};

export const deleteExpense = async (id) => {
  try {
    const expenses = await getExpenses();
    const filteredExpenses = expenses.filter(item => item.id !== id);
    await saveExpenses(filteredExpenses);
    return true;
  } catch (e) {
    console.error('Error deleting expense', e);
    throw e;
  }
};

// --- NEW SYSTEM: SIKLUS TANAM (CYCLES) ---

export const getCycles = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(CYCLES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Error reading cycles from storage', e);
    return [];
  }
};

export const saveCycles = async (cycles) => {
  try {
    const jsonValue = JSON.stringify(cycles);
    await AsyncStorage.setItem(CYCLES_KEY, jsonValue);
    return true;
  } catch (e) {
    console.error('Error saving cycles to storage', e);
    return false;
  }
};

export const createCycle = async (crop, name, startDate) => {
  try {
    const cycles = await getCycles();
    const newCycle = {
      id: 'cycle_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      crop,
      name: name || `${crop} - Lahan ${cycles.length + 1}`,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: null,
      status: 'active', // 'active' | 'archived'
      harvestResult: 0,
      harvestPrice: 0,
    };
    cycles.unshift(newCycle);
    await saveCycles(cycles);
    return newCycle;
  } catch (e) {
    console.error('Error creating cycle', e);
    throw e;
  }
};

export const updateCycleHarvest = async (siklusId, harvestResult, harvestPrice) => {
  try {
    const cycles = await getCycles();
    const index = cycles.findIndex(c => c.id === siklusId);
    if (index !== -1) {
      cycles[index].harvestResult = parseFloat(harvestResult) || 0;
      cycles[index].harvestPrice = parseFloat(harvestPrice) || 0;
      await saveCycles(cycles);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Error updating cycle harvest', e);
    return false;
  }
};

export const getArchivedCycles = async () => {
  try {
    const cycles = await getCycles();
    return cycles.filter(c => c.status === 'archived');
  } catch (e) {
    console.error('Error getting archived cycles', e);
    return [];
  }
};

export const archiveCycleBySiklus = async (siklusId) => {
  try {
    const cycles = await getCycles();
    const cycleIndex = cycles.findIndex(c => c.id === siklusId);
    if (cycleIndex === -1) throw new Error('Siklus tidak ditemukan');

    const cycle = cycles[cycleIndex];
    const expenses = await getExpenses();

    // Hitung pengeluaran aktif khusus untuk siklus ini
    const cycleExpenses = expenses.filter(
      item => item.siklusId === siklusId && !item.is_archived
    );

    const totalExpenses = cycleExpenses.reduce((sum, item) => sum + (item.nominal || 0), 0);
    const estHasil = parseFloat(cycle.harvestResult) || 0;
    const hargaJual = parseFloat(cycle.harvestPrice) || 0;
    const estRevenue = estHasil * hargaJual;
    const estProfit = estRevenue - totalExpenses;
    const marginPercent = estRevenue > 0 ? (estProfit / estRevenue) * 100 : 0;

    // Update siklus di database menjadi terarsip
    cycles[cycleIndex] = {
      ...cycle,
      status: 'archived',
      endDate: new Date().toISOString().split('T')[0],
      totalExpenses,
      estRevenue,
      estProfit,
      marginPercent,
    };
    await saveCycles(cycles);

    // Tandai pengeluaran terkait sebagai terarsip
    const updatedExpenses = expenses.map(item => {
      if (item.siklusId === siklusId && !item.is_archived) {
        return { ...item, is_archived: true };
      }
      return item;
    });
    await saveExpenses(updatedExpenses);

    return cycles[cycleIndex];
  } catch (e) {
    console.error('Error archiving cycle by ID', e);
    throw e;
  }
};

// --- LEGACY BACKWARD COMPATIBILITY HELPERS ---

export const getPanen = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(PANEN_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : {};
  } catch (e) {
    console.error('Error reading panen data', e);
    return {};
  }
};

export const savePanen = async (panenMap) => {
  try {
    await AsyncStorage.setItem(PANEN_KEY, JSON.stringify(panenMap));
    return true;
  } catch (e) {
    return false;
  }
};

export const archiveCycle = async (commodityName) => {
  // Legacy function fallback
  try {
    const cycles = await getCycles();
    const activeCycle = cycles.find(c => c.crop === commodityName && c.status === 'active');
    if (activeCycle) {
      return await archiveCycleBySiklus(activeCycle.id);
    }
    throw new Error('Siklus aktif komoditas tidak ditemukan');
  } catch (e) {
    console.error('Error legacy archiving', e);
    throw e;
  }
};

// --- AUTO-MIGRATION SYSTEM ---

export const migrateOldDataIfNeeded = async () => {
  try {
    const hasCycles = await AsyncStorage.getItem(CYCLES_KEY);
    if (hasCycles !== null) {
      return; // Sudah termigrasi/terinisialisasi
    }

    const expenses = await getExpenses();
    const oldArchives = await AsyncStorage.getItem(ARCHIVED_CYCLES_KEY);
    const parsedArchives = oldArchives != null ? JSON.parse(oldArchives) : [];
    const oldPanen = await getPanen();

    const migratedCycles = [];

    // 1. Migrasi Pengeluaran Aktif ke Siklus Aktif Baru
    const activeExpenses = expenses.filter(e => !e.is_archived);
    const cropGroups = {};
    activeExpenses.forEach(e => {
      const crop = e.komoditas || 'Padi';
      if (!cropGroups[crop]) cropGroups[crop] = [];
      cropGroups[crop].push(e);
    });

    for (const crop in cropGroups) {
      const cycleId = 'cycle_migrated_active_' + crop;
      const cropPanen = oldPanen[crop] || { estimasi_hasil_kg: 0, harga_jual_per_kg: 0 };
      
      migratedCycles.push({
        id: cycleId,
        crop,
        name: `${crop} - Lahan Utama`,
        startDate: new Date().toISOString().split('T')[0],
        endDate: null,
        status: 'active',
        harvestResult: parseFloat(cropPanen.estimasi_hasil_kg) || 0,
        harvestPrice: parseFloat(cropPanen.harga_jual_per_kg) || 0,
      });

      // Tautkan transaksi aktif ke siklus ini
      cropGroups[crop].forEach(e => {
        e.siklusId = cycleId;
      });
    }

    // 2. Migrasi Riwayat Arsip Lama ke Siklus Terarsip
    parsedArchives.forEach((archive, i) => {
      const cycleId = 'cycle_migrated_archived_' + i + '_' + Date.now();
      migratedCycles.push({
        id: cycleId,
        crop: archive.komoditas || 'Padi',
        name: `${archive.komoditas || 'Padi'} - Arsip (${archive.tanggal_selesai})`,
        startDate: null,
        endDate: archive.tanggal_selesai,
        status: 'archived',
        harvestResult: parseFloat(archive.estimasi_hasil_kg) || 0,
        harvestPrice: parseFloat(archive.harga_jual_per_kg) || 0,
        totalExpenses: archive.total_pengeluaran || 0,
        estRevenue: archive.estimasi_pendapatan || 0,
        estProfit: archive.estimasi_untung || 0,
        marginPercent: archive.persentase_keuntungan || 0,
      });
    });

    // Simpan data hasil migrasi
    await saveCycles(migratedCycles);
    await saveExpenses(expenses);
    console.log(`Auto-migration complete: Migrated ${migratedCycles.length} cycles.`);
  } catch (e) {
    console.error('Error during data migration:', e);
  }
};

export const seedInitialData = async () => {
  try {
    await migrateOldDataIfNeeded();
  } catch (err) {
    console.error('Failed to run initial migrations', err);
  }
};

// Clear all app data from AsyncStorage
export const clearAllData = async () => {
  try {
    await AsyncStorage.removeItem(EXPENSES_KEY);
    await AsyncStorage.removeItem(PANEN_KEY);
    await AsyncStorage.removeItem(ARCHIVED_CYCLES_KEY);
    await AsyncStorage.removeItem(CYCLES_KEY);
  } catch (e) {
    console.error('Error clearing data from storage', e);
    throw e;
  }
};
