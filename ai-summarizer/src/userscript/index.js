import { setup as setupStorage } from './storage.js';
import { setup as setupHttp } from './http.js';
import { createUI } from '../core/ui.js';

setupStorage(GM_getValue, GM_setValue);
setupHttp(GM_xmlhttpRequest);
createUI();
