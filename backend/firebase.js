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

// Characters helpers
// Create a new character under users/<userId>/characters -> returns the new key
async function createCharacter(userId, characterData) {
  const charsRef = admin.database().ref(`users/${userId}/characters`);
  const newRef = await charsRef.push();
  await newRef.set(characterData);
  return newRef.key;
}

// Update an existing character by id
async function updateCharacter(userId, charId, updateData) {
  const charRef = admin.database().ref(`users/${userId}/characters/${charId}`);
  await charRef.update(updateData);
  return true;
}

// Delete an existing character by id
async function deleteCharacter(userId, charId) {
  const charRef = admin.database().ref(`users/${userId}/characters/${charId}`);
  await charRef.remove();
  return true;
}

module.exports = {
  getUserProfile,
  setUserProfile,
  updateUserProfile,
  deleteUserProfile,
  createCharacter,
  updateCharacter,
  deleteCharacter,
};
