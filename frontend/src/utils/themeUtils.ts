// src/utils/themeUtils.ts
import { useUserStore } from '../stores/userStore';

/**
 * 主题类型
 */
export type ThemeType = 'light' | 'dark';

/**
 * 获取当前主题
 * @returns 当前主题类型
 */
export const getCurrentTheme = (): ThemeType => {
  // 优先从userStore获取
  const { theme } = useUserStore.getState();
  if (theme) return theme;
  
  // 其次从localStorage获取
  const savedTheme = localStorage.getItem('theme') as ThemeType;
  if (savedTheme) return savedTheme;
  
  // 最后从系统偏好获取
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * 应用主题到DOM
 * @param theme 主题类型
 */
export const applyTheme = (theme: ThemeType): void => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
};

/**
 * 切换主题
 * @returns 切换后的主题
 */
export const toggleTheme = (): ThemeType => {
  const { theme, toggleTheme } = useUserStore.getState();
  toggleTheme();
  return theme === 'light' ? 'dark' : 'light';
};

/**
 * 监听系统主题变化
 * @param callback 回调函数
 */
export const watchSystemTheme = (callback: (isDark: boolean) => void): () => void => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = (e: MediaQueryListEvent) => {
    callback(e.matches);
  };
  
  mediaQuery.addEventListener('change', handleChange);
  
  // 返回清理函数
  return () => mediaQuery.removeEventListener('change', handleChange);
};