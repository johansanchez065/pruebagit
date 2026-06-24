const STORAGE_KEY = 'shelf-finder-display-name';

// A name typed once per device, kept in localStorage (not Firebase auth) so
// "Encontrado por ___" attributions are readable without any login flow.
export function getDisplayName() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function setDisplayName(name) {
  try {
    localStorage.setItem(STORAGE_KEY, name.trim());
  } catch {
    // localStorage can be unavailable (private mode); the prompt will just
    // reappear next time, which is harmless.
  }
}
