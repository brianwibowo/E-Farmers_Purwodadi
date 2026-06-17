import { Platform } from 'react-native';
import { getExpenses, saveExpenses, getPanen, savePanen } from './storage';

// Hanya import FileSystem & Sharing di HP (bukan web)
let FileSystem = null;
let Sharing = null;
let DocumentPicker = null;

if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system/legacy');
  Sharing = require('expo-sharing');
  DocumentPicker = require('expo-document-picker');
}

/**
 * Simpan semua data ke file backup .json
 */
export const exportBackup = async (username) => {
  try {
    // Kumpulkan semua data
    const expenses = await getExpenses();
    const panen = await getPanen();

    const backupData = {
      _meta: {
        app: 'E-Farmers Purwodadi',
        versi: '1.0.0',
        tanggal_backup: new Date().toISOString(),
        dibuat_oleh: username || 'pengguna',
        jumlah_catatan: expenses.length,
      },
      expenses,
      panen,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const tanggal = new Date().toISOString().split('T')[0];
    const namaFile = `backup_efarmers_${tanggal}.json`;

    // ── Kalau di Web (browser) ──
    if (Platform.OS === 'web') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = namaFile;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return {
        success: true,
        message: `Backup berhasil diunduh!\nTotal ${expenses.length} catatan tersimpan.`,
      };
    }

    // ── Kalau di HP (Android/iOS) ──
    const filePath = `${FileSystem.cacheDirectory}${namaFile}`;

    await FileSystem.writeAsStringAsync(filePath, jsonString, {
      encoding: 'utf8',
    });

    const bisaBagikan = await Sharing.isAvailableAsync();
    if (bisaBagikan) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Simpan Backup E-Farmers',
      });
    }

    return {
      success: true,
      message: `Backup berhasil!\nTotal ${expenses.length} catatan tersimpan.`,
    };
  } catch (error) {
    console.error('Gagal backup:', error);
    return {
      success: false,
      message: `Gagal membuat backup: ${error.message}`,
    };
  }
};

/**
 * Pulihkan data dari file backup .json
 */
export const importBackup = async () => {
  try {
    let jsonString = '';

    // ── Kalau di Web (browser) ──
    if (Platform.OS === 'web') {
      jsonString = await new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) {
            reject(new Error('Dibatalkan.'));
            return;
          }
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.onerror = () => reject(new Error('Gagal membaca file.'));
          reader.readAsText(file);
        };
        input.oncancel = () => reject(new Error('Dibatalkan.'));
        input.click();
      });
    } else {
      // ── Kalau di HP (Android/iOS) ──
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return { success: false, message: 'Dibatalkan.' };
      }

      const asset = result.assets[0];
      if (!asset || !asset.uri) {
        return { success: false, message: 'File tidak ditemukan.' };
      }

      jsonString = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'utf8',
      });
    }

    // Cek isi file
    let backupData;
    try {
      backupData = JSON.parse(jsonString);
    } catch (parseErr) {
      return {
        success: false,
        message: 'File ini bukan file backup yang benar.\nPastikan memilih file backup E-Farmers.',
      };
    }

    // Pastikan ini file backup E-Farmers
    if (!backupData._meta || backupData._meta.app !== 'E-Farmers Purwodadi') {
      return {
        success: false,
        message: 'File ini bukan backup E-Farmers Purwodadi.',
      };
    }

    if (!Array.isArray(backupData.expenses)) {
      return {
        success: false,
        message: 'Data catatan di dalam file tidak lengkap.',
      };
    }

    // Gabungkan data — yang sudah ada tidak akan terduplikasi
    const catatanLama = await getExpenses();
    const idLama = new Set(catatanLama.map((e) => e.id));

    let catatanBaru = 0;
    const semuaCatatan = [...catatanLama];

    for (const item of backupData.expenses) {
      if (!idLama.has(item.id)) {
        semuaCatatan.push(item);
        catatanBaru++;
      }
    }

    // Urutkan dari tanggal terbaru
    semuaCatatan.sort((a, b) => {
      if (a.tanggal > b.tanggal) return -1;
      if (a.tanggal < b.tanggal) return 1;
      return 0;
    });

    await saveExpenses(semuaCatatan);

    // Pulihkan data panen
    if (backupData.panen) {
      const p = backupData.panen;
      if (p.estimasi_hasil_kg || p.harga_jual_per_kg) {
        await savePanen(p);
      }
    }

    const dilewati = backupData.expenses.length - catatanBaru;

    return {
      success: true,
      message: `Data berhasil dipulihkan!\n\n• ${catatanBaru} catatan baru ditambahkan\n• ${dilewati} catatan sudah ada (dilewati)`,
    };
  } catch (error) {
    if (error.message === 'Dibatalkan.') {
      return { success: false, message: 'Dibatalkan.' };
    }
    console.error('Gagal restore:', error);
    return {
      success: false,
      message: `Gagal memulihkan data: ${error.message}`,
    };
  }
};
