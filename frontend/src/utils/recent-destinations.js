/**
 * Persistence helpers for recently viewed destinations and search history.
 * Stored safely in localStorage under prefixed keys.
 */

const RECENT_DESTINATIONS_KEY = 'gantavya_recent_destinations';
const SEARCH_HISTORY_KEY = 'gantavya_search_history';

export function getRecentlyViewedDestinations() {
  try {
    const raw = localStorage.getItem(RECENT_DESTINATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function addRecentlyViewedDestination(dest) {
  if (!dest || !dest._id) return;
  try {
    const list = getRecentlyViewedDestinations();
    const filtered = list.filter((item) => item._id !== dest._id);
    const updated = [
      {
        _id: dest._id,
        name: dest.name,
        country: dest.country,
        city: dest.city || '',
        description: dest.description || '',
        categories: dest.categories || [],
        viewedAt: new Date().toISOString()
      },
      ...filtered
    ].slice(0, 6);

    localStorage.setItem(RECENT_DESTINATIONS_KEY, JSON.stringify(updated));
  } catch (e) {
    // Non-blocking storage fallback
  }
}

export function getSearchHistory() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function addSearchHistory(term) {
  const clean = (term || '').trim();
  if (!clean || clean.length < 2) return;
  try {
    const list = getSearchHistory();
    const filtered = list.filter((item) => item.toLowerCase() !== clean.toLowerCase());
    const updated = [clean, ...filtered].slice(0, 8);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    // Non-blocking
  }
}

export function clearSearchHistory() {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (e) {
    // Non-blocking
  }
}

