/**
 * ddrReader - Application Entry Point
 */

import './styles/main.css';
import './styles/book.css';
import './styles/library.css';
import './styles/importer.css';
import './styles/prism-theme.css';

import { App } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
