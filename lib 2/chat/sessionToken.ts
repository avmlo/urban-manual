const STORAGE_KEY = 'um_conversation_session_token';

function generateToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getStoredConversationSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to read conversation session token:', error);
    return null;
  }
}

export function persistConversationSessionToken(token: string) {
  if (typeof window === 'undefined' || !token) return;
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch (error) {
    console.warn('Unable to persist conversation session token:', error);
  }
}

export function ensureConversationSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  let token = getStoredConversationSessionToken();
  if (!token) {
    token = generateToken();
    persistConversationSessionToken(token);
  }
  return token;
}

export function clearConversationSessionToken() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear conversation session token:', error);
  }
}
