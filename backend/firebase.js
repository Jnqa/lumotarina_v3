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

// Notes helpers (per-user)
async function createNote(userId, noteData) {
  const notesRef = admin.database().ref(`notes/${userId}`);
  const newRef = await notesRef.push();
  const id = newRef.key;
  const now = Date.now();
  const payload = { id, createdAt: now, updatedAt: now, ...(noteData || {}) };
  await newRef.set(payload);
  return payload;
}

async function getNote(userId, noteId) {
  const ref = admin.database().ref(`notes/${userId}/${noteId}`);
  const snap = await ref.once('value');
  return snap.val();
}

async function listNotes(userId) {
  const ref = admin.database().ref(`notes/${userId}`);
  const snap = await ref.once('value');
  const val = snap.val() || {};
  // return array of notes
  return Object.keys(val).map(k => val[k]);
}

async function updateNote(userId, noteId, updateData) {
  const ref = admin.database().ref(`notes/${userId}/${noteId}`);
  updateData.updatedAt = Date.now();
  await ref.update(updateData);
  const snap = await ref.once('value');
  return snap.val();
}

async function deleteNote(userId, noteId) {
  const ref = admin.database().ref(`notes/${userId}/${noteId}`);
  await ref.remove();
  return true;
}

// Tag helpers (per-user)
async function listTags(userId) {
  const ref = admin.database().ref(`note_tags/${userId}`);
  const snap = await ref.once('value');
  const val = snap.val() || {};
  return Object.keys(val).map(k => val[k]);
}

async function createTag(userId, tagData) {
  const ref = admin.database().ref(`note_tags/${userId}`);
  const newRef = await ref.push();
  const id = newRef.key;
  const payload = { id, name: (tagData && tagData.name) || '', createdAt: Date.now() };
  await newRef.set(payload);
  return payload;
}


module.exports = {
  getUserProfile,
  setUserProfile,
  updateUserProfile,
  deleteUserProfile,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  createNote,
  getNote,
  listNotes,
  updateNote,
  deleteNote,
  listTags,
  createTag,
};
