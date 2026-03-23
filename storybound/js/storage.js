// js/storage.js

const SETTINGS_KEY = 'storybound_settings';
const CHARACTERS_KEY = 'storybound_characters';

const DEFAULT_SETTINGS = {
  apiBaseUrl: 'https://api.x.ai/v1',
  apiKey: '',
  textModel: 'grok-4-1-fast-non-reasoning',
  imageModel: 'grok-imagine-image-pro',
  allowMatureContent: false
};

function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return Object.assign({}, DEFAULT_SETTINGS);
    return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
  } catch (e) {
    return Object.assign({}, DEFAULT_SETTINGS);
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (e) {
    // Handle QuotaExceededError when storage is full
    return false;
  }
}

function loadAllCharacters() {
  try {
    const raw = localStorage.getItem(CHARACTERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveCharacter(character, environment, history) {
  const name = (character && character.name) ? String(character.name) : 'unknown';
  // Note: different character names that sanitize to the same key will silently overwrite each other
  // (e.g., "Aria!" and "Aria?" both become "aria")
  const key = name.toLowerCase().replace(/[^a-z0-9._-]+/g, '_').replace(/^[._-]+|[._-]+$/g, '') || 'unknown_character';
  const records = loadAllCharacters();
  const idx = records.findIndex(function(r) { return r.key === key; });
  const record = {
    key: key,
    character: character,
    environment: environment,
    history: history,
    lastPlayed: new Date().toISOString()
  };
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.push(record);
  }
  try {
    localStorage.setItem(CHARACTERS_KEY, JSON.stringify(records));
    return key;
  } catch (e) {
    // Handle QuotaExceededError when storage is full
    return false;
  }
}

function deleteCharacter(characterKey) {
  const records = loadAllCharacters();
  const filtered = records.filter(function(r) { return r.key !== characterKey; });
  // NOTE: returns false if the write fails (e.g. QuotaExceededError).
  // In that case the deletion did NOT persist — the character still exists in storage.
  // Callers should check the return value if correctness matters.
  try {
    localStorage.setItem(CHARACTERS_KEY, JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.warn('[storage] deleteCharacter: failed to persist deletion:', e);
    return false;
  }
}

function hasSettings() {
  const s = getSettings();
  return Boolean(s.apiKey);
}
