import { init } from '../adapters/storage.js';

export function setup(GM_getValue, GM_setValue) {
  init({
    get: async (key, defaultVal) => GM_getValue(key, defaultVal),
    set: async (key, val) => GM_setValue(key, val),
  });
}
