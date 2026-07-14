const FONT_SCALE_KEY = 'p38_font_scale';
const DEFAULT_FONT_SCALE = 1;

export const FONT_SCALE_CHANGE_EVENT = 'p38-font-scale-change';

export const FONT_SCALE_OPTIONS = [
  { label: 'A', value: 1 },
  { label: 'A+', value: 1.125 },
  { label: 'A++', value: 1.25 },
];

const normalizeScale = (value) => {
  const parsed = Number(value);
  const valid = FONT_SCALE_OPTIONS.find((option) => option.value === parsed);
  return valid ? valid.value : DEFAULT_FONT_SCALE;
};

export const getStoredFontScale = () => {
  if (typeof window === 'undefined') return DEFAULT_FONT_SCALE;
  return normalizeScale(window.localStorage.getItem(FONT_SCALE_KEY));
};

export const applyFontScale = (value) => {
  const scale = normalizeScale(value);
  document.documentElement.style.setProperty('--app-font-scale', String(scale));
  return scale;
};

export const setStoredFontScale = (value) => {
  const scale = applyFontScale(value);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(FONT_SCALE_KEY, String(scale));
    window.dispatchEvent(new CustomEvent(FONT_SCALE_CHANGE_EVENT, { detail: { scale } }));
  }
  return scale;
};