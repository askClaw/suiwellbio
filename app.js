import * as context from './common.js';
import { initHome } from './home.js';
import { initPages } from './pages.js';

if (document.body.dataset.page === 'home') initHome(context);
initPages(context);
