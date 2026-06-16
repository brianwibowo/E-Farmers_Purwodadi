/**
 * Financial calculations helper functions.
 */

export const calculateTotalPengeluaran = (expenses = []) => {
  return expenses.reduce((total, item) => total + (parseFloat(item.nominal) || 0), 0);
};

export const calculateEstimasiPendapatan = (panen = {}) => {
  const hasil = parseFloat(panen.estimasi_hasil_kg) || 0;
  const harga = parseFloat(panen.harga_jual_per_kg) || 0;
  return hasil * harga;
};

export const calculateUntungRugi = (pendapatan, pengeluaran) => {
  return pendapatan - pengeluaran;
};

export const calculatePersentase = (untung, pendapatan) => {
  if (!pendapatan || pendapatan <= 0) return 0;
  return (untung / pendapatan) * 100;
};

export const formatRupiah = (value) => {
  if (value === undefined || value === null || isNaN(value)) {
    return 'Rp 0';
  }
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
  
  // Handing negative numbers properly
  if (value < 0) {
    return `-Rp ${formatted.replace('-', '')}`;
  }
  return `Rp ${formatted}`;
};
