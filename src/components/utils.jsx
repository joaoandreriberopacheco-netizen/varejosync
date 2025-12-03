export function cn(...inputs) {
  return inputs.flat().filter(Boolean).join(" ");
}

export const createPageUrl = (pageName) => {
    if (!pageName) return '/';
    return `/${pageName}`;
};