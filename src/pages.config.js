/**
 * pages.config.js — rotas com lazy loading (chunk por página via Vite glob)
 *
 * mainPage: landing após login
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

const pageModules = import.meta.glob('./pages/*.jsx');

export const PAGES = Object.fromEntries(
  Object.entries(pageModules).map(([path, load]) => {
    const name = path.replace(/^\.\/pages\//, '').replace(/\.jsx$/, '');
    return [name, lazy(load)];
  })
);

export const pagesConfig = {
  mainPage: 'Home',
  Pages: PAGES,
  Layout: __Layout,
};
