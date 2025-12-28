/**
 * LocalStorage Utilities
 * Helper functions for persistent storage operations
 */

import { LAST_OPEN_WINDOW_STORAGE_KEY } from '../config/constants.js';

/**
 * Get last open window ID from localStorage
 * @returns {string|null} Window ID or null if not found
 */
export function getLastOpenWindowId() {
  try {
    return localStorage.getItem(LAST_OPEN_WINDOW_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Set last open window ID in localStorage
 * @param {string} windowId - Window ID to persist (if null/undefined, removes the key)
 */
export function setLastOpenWindowId(windowId) {
  try {
    if (!windowId) {
      localStorage.removeItem(LAST_OPEN_WINDOW_STORAGE_KEY);
      return;
    }
    localStorage.setItem(LAST_OPEN_WINDOW_STORAGE_KEY, windowId);
  } catch {
    // Silently ignore localStorage errors
  }
}
