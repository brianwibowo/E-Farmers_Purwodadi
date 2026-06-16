import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_KEY = '@efarmers:users';
const SESSION_KEY = '@efarmers:session';

// Helper to get all registered users
export const getUsers = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(USERS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Error getting users', e);
    return [];
  }
};

// Register a new user
export const registerUser = async (username, password, phone) => {
  try {
    const users = await getUsers();
    const formattedUsername = username.trim();
    const formattedPhone = phone.trim();
    
    // Check if username already exists (case-insensitive)
    const exists = users.some(u => u.username.toLowerCase() === formattedUsername.toLowerCase());
    if (exists) {
      throw new Error('Username sudah terdaftar.');
    }

    // Check if phone number already exists
    const phoneExists = users.some(u => u.phone === formattedPhone);
    if (phoneExists) {
      throw new Error('Nomor HP sudah terdaftar.');
    }

    const newUser = {
      username: formattedUsername,
      password: password, // Simple plain text for local MVP context
      phone: formattedPhone,
      photoUri: null, // Default profile photo
    };

    users.push(newUser);
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    return newUser;
  } catch (e) {
    console.error('Error registering user', e);
    throw e;
  }
};

// Authenticate user credentials by username or phone number
export const authenticateUser = async (identifier, password) => {
  try {
    const users = await getUsers();
    const query = identifier.trim().toLowerCase();

    const user = users.find(
      u => (u.username.toLowerCase() === query || (u.phone && u.phone.toLowerCase() === query)) && u.password === password
    );

    if (!user) {
      throw new Error('Username / Nomor HP atau password salah.');
    }

    // Save active session
    const sessionUser = { username: user.username, phone: user.phone, photoUri: user.photoUri };
    await saveSession(sessionUser);
    return sessionUser;
  } catch (e) {
    console.error('Error authenticating user', e);
    throw e;
  }
};

// Get current active session
export const getSession = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(SESSION_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error('Error reading session', e);
    return null;
  }
};

// Save active session
export const saveSession = async (user) => {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Error saving session', e);
  }
};

// Clear active session (Logout)
export const clearSession = async () => {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.error('Error clearing session', e);
  }
};

// Update profile info (username, password, photo, phone)
export const updateUserProfile = async (oldUsername, newUsername, newPassword, photoUri, newPhone) => {
  try {
    const users = await getUsers();
    const formattedOld = oldUsername.trim();
    const formattedNew = newUsername.trim();
    const formattedPhone = newPhone ? newPhone.trim() : '';

    const index = users.findIndex(u => u.username.toLowerCase() === formattedOld.toLowerCase());
    if (index === -1) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    // If changing username, check if new one is already taken by someone else
    if (formattedOld.toLowerCase() !== formattedNew.toLowerCase()) {
      const exists = users.some(u => u.username.toLowerCase() === formattedNew.toLowerCase());
      if (exists) {
        throw new Error('Username baru sudah terdaftar.');
      }
    }

    // If changing phone number, check if new one is already taken by someone else
    if (formattedPhone && users[index].phone !== formattedPhone) {
      const phoneExists = users.some(u => u.phone === formattedPhone);
      if (phoneExists) {
        throw new Error('Nomor HP baru sudah terdaftar.');
      }
    }

    // Update fields
    users[index].username = formattedNew;
    if (newPassword && newPassword.trim() !== '') {
      users[index].password = newPassword;
    }
    if (formattedPhone) {
      users[index].phone = formattedPhone;
    }
    
    // photoUri could be a base64 string or file path from image picker
    if (photoUri !== undefined) {
      users[index].photoUri = photoUri;
    }

    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

    // Update active session
    const updatedSessionUser = {
      username: users[index].username,
      phone: users[index].phone,
      photoUri: users[index].photoUri,
    };
    await saveSession(updatedSessionUser);
    return updatedSessionUser;
  } catch (e) {
    console.error('Error updating user profile', e);
    throw e;
  }
};

// Reset user password directly by username or phone number
export const resetUserPassword = async (identifier, newPassword) => {
  try {
    const users = await getUsers();
    const query = identifier.trim().toLowerCase();

    const index = users.findIndex(
      u => u.username.toLowerCase() === query || (u.phone && u.phone.toLowerCase() === query)
    );
    if (index === -1) {
      throw new Error('Username atau Nomor HP tidak terdaftar.');
    }

    users[index].password = newPassword;
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    return users[index];
  } catch (e) {
    console.error('Error resetting password', e);
    throw e;
  }
};
