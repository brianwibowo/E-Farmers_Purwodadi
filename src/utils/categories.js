export const categories = [
  { id: 'pupuk', label: 'Pupuk', icon: 'compost' },
  { id: 'pestisida', label: 'Pestisida', icon: 'bug-report' },
  { id: 'obat', label: 'Obat-obatan', icon: 'medication' },
  { id: 'sewa', label: 'Sewa (Lahan/Alat)', icon: 'agriculture' },
  { id: 'lainnya', label: 'Lainnya', icon: 'receipt-long' },
];

export const getCategoryById = (id) => {
  return categories.find(cat => cat.id === id) || { id: 'lainnya', label: 'Lainnya', icon: 'receipt-long' };
};
