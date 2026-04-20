import { init } from '../adapters/storage.js';

export function setup() {
  init({
    get: async (key, defaultVal) => {
      const data = await chrome.storage.local.get(key);
      return data[key] ?? defaultVal;
    },
    set: async (key, val) => {
      await chrome.storage.local.set({ [key]: val });
    },
  });
}
