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
  const { theme } = useUserStore.getState();
  return theme || 'light';
};

/**
 * 应用主题到DOM
 * @param theme 主题类型
 */
export const applyTheme = (theme: ThemeType): void => {
  const { theme: currentTheme, setTheme } = useUserStore.getState();
  if (theme !== currentTheme) {
    setTheme(theme);
  }
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
  
  const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
    callback(e.matches);
  };
  
  // 初始调用一次以设置初始状态
  handleChange(mediaQuery);

  // 使用新的事件监听API
  mediaQuery.addEventListener('change', handleChange);
  
  // 返回清理函数
  return () => mediaQuery.removeEventListener('change', handleChange);
};