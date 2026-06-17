import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPENSES_KEY = '@efarmers:expenses';
const PANEN_KEY = '@efarmers:panen';

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

export const getPanen = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(PANEN_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : { estimasi_hasil_kg: '', harga_jual_per_kg: '' };
  } catch (e) {
    console.error('Error reading panen data from storage', e);
    return { estimasi_hasil_kg: '', harga_jual_per_kg: '' };
  }
};

export const savePanen = async (panenData) => {
  try {
    const jsonValue = JSON.stringify({
      estimasi_hasil_kg: parseFloat(panenData.estimasi_hasil_kg) || 0,
      harga_jual_per_kg: parseFloat(panenData.harga_jual_per_kg) || 0,
    });
    await AsyncStorage.setItem(PANEN_KEY, jsonValue);
    return true;
  } catch (e) {
    console.error('Error saving panen data to storage', e);
    return false;
  }
};

// Seed initial data if storage is empty (disabled for clean database)
export const seedInitialData = async () => {
  // Disabling seeding to keep database clean
};

// Clear all app data from AsyncStorage
export const clearAllData = async () => {
  try {
    await AsyncStorage.removeItem(EXPENSES_KEY);
    await AsyncStorage.removeItem(PANEN_KEY);
  } catch (e) {
    console.error('Error clearing data from storage', e);
    throw e;
  }
};
