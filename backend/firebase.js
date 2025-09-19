const admin = require('firebase-admin');

// Получить профиль пользователя по tg_id
async function getUserProfile(tg_id) {
  const userRef = admin.database().ref(`users/${tg_id}`);
  const snapshot = await userRef.once('value');
  return snapshot.val();
}

// Создать или обновить профиль пользователя
async function setUserProfile(tg_id, profileData) {
  const userRef = admin.database().ref(`users/${tg_id}`);
  await userRef.set(profileData);
}

// Частичное обновление профиля пользователя
async function updateUserProfile(tg_id, updateData) {
  const userRef = admin.database().ref(`users/${tg_id}`);
  await userRef.update(updateData);
}

// Удалить профиль пользователя
async function deleteUserProfile(tg_id) {
  const userRef = admin.database().ref(`users/${tg_id}`);
  await userRef.remove();
}

module.exports = {
  getUserProfile,
  setUserProfile,
  updateUserProfile,
  deleteUserProfile,
};
