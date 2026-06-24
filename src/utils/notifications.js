import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const REMINDER_KEY = '@efarmers:reminder_frequency';

/**
 * Inisialisasi handler notifikasi agar tampil di foreground
 */
export const setupNotificationHandler = () => {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

/**
 * Meminta izin notifikasi dari pengguna
 * @returns {Promise<boolean>} Status apakah izin diberikan
 */
export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'web') return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.warn('Notification permission request failed or not supported in this environment:', err);
    // Kembalikan true agar pengguna di Expo Go / Simulator tetap bisa memilih opsi pengingat di UI
    return true;
  }
};

/**
 * Mengambil pengaturan frekuensi pengingat yang tersimpan
 * @returns {Promise<string>} 'off' | 'daily' | 'three_times' | 'weekly'
 */
export const getReminderSettings = async () => {
  try {
    const val = await AsyncStorage.getItem(REMINDER_KEY);
    return val || 'off';
  } catch (err) {
    console.error('Failed to get reminder settings', err);
    return 'off';
  }
};

/**
 * Menyimpan pengaturan pengingat ke AsyncStorage
 * @param {string} frequency 
 */
export const saveReminderSettings = async (frequency) => {
  try {
    await AsyncStorage.setItem(REMINDER_KEY, frequency);
  } catch (err) {
    console.error('Failed to save reminder settings', err);
  }
};

/**
 * Memicu notifikasi konfirmasi langsung saat pengingat diaktifkan
 */
export const triggerInstantTestNotification = async (frequency) => {
  if (Platform.OS === 'web') return;

  try {
    let label = '';
    if (frequency === 'daily') label = 'Harian';
    if (frequency === 'three_times') label = '3x Seminggu (Senin, Rabu, Jumat)';
    if (frequency === 'weekly') label = '1x Seminggu (Sabtu)';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Pengingat WicakTani Aktif 🌾",
        body: `Pengingat berhasil diaktifkan untuk jadwal: ${label}.`,
        sound: true,
      },
      trigger: null, // Langsung dikirim sekarang
    });
  } catch (err) {
    console.warn('Failed to trigger instant test notification:', err);
  }
};

/**
 * Menjadwalkan notifikasi lokal berdasarkan frekuensi terpilih
 * @param {string} frequency 'off' | 'daily' | 'three_times' | 'weekly'
 */
export const scheduleReminderNotifications = async (frequency) => {
  if (Platform.OS === 'web') return;

  try {
    // Hapus semua penjadwalan notifikasi sebelumnya
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (frequency === 'off') {
      return;
    }

    const notificationTitle = "WicakTani";
    const timeTrigger = {
      type: 'daily',
      hour: 19, // Pukul 19:00 WIB / 7 sore hari
      minute: 0,
    };

    if (frequency === 'daily') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationTitle,
          body: "Apakah ada pengeluaran atau hasil panen tanaman hari ini? Yuk, catat di WicakTani sekarang!",
          sound: true,
        },
        trigger: timeTrigger,
      });
    } else if (frequency === 'three_times') {
      // Senin (2), Rabu (4), dan Jumat (6)
      const days = [2, 4, 6];
      for (const day of days) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notificationTitle,
            body: "Jangan lupa catat pengeluaran bibit, pupuk, atau obat tani Anda di WicakTani.",
            sound: true,
          },
          trigger: {
            type: 'weekly',
            weekday: day,
            hour: 19,
            minute: 0,
          },
        });
      }
    } else if (frequency === 'weekly') {
      // Sabtu (7)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationTitle,
          body: "Akhir pekan telah tiba! Yuk, rekap dan rapikan seluruh pembukuan keuangan tani Anda minggu ini di WicakTani.",
          sound: true,
        },
        trigger: {
          type: 'weekly',
          weekday: 7,
          hour: 19,
          minute: 0,
        },
      });
    }
  } catch (err) {
    console.warn('Failed to schedule local reminder notifications:', err);
  }
};
