// src/stores/userStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { toast } from '../components/common/Toast';
import { UserSettings } from '../types';

interface UserState {
  // 用户基本信息
  userSettings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  
  // 主题设置
  theme: 'light' | 'dark';
  soundEnabled: boolean;
  
  // 方法
  loadUserSettings: (userId: string) => Promise<UserSettings | null>;
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<boolean>;
  updateAvatar: (avatarUrl: string) => void;
  updateNickname: (nickname: string) => void;
  toggleTheme: () => void;
  toggleSound: () => void;
  clearUserData: () => void;
  setError: (error: string | null) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  // 初始状态
  userSettings: null,
  isLoading: false,
  error: null,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  soundEnabled: localStorage.getItem('sound_enabled') !== 'false',
  
  // 加载用户设置
  loadUserSettings: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      
      if (!data) {
        set({ isLoading: false });
        return null;
      }
      
      const userSettings: UserSettings = {
        id: data.id,
        nickname: data.nickname,
        avatar: data.avatar,
        soundEnabled: data.sound_enabled !== false,
        theme: data.theme || 'light'
      };
      
      set({ 
        userSettings,
        isLoading: false,
        theme: userSettings.theme || 'light',
        soundEnabled: userSettings.soundEnabled !== false
      });
      
      // 保存到本地存储
      localStorage.setItem('theme', userSettings.theme || 'light');
      localStorage.setItem('sound_enabled', String(userSettings.soundEnabled !== false));
      
      return userSettings;
    } catch (error) {
      console.error('加载用户设置失败:', error);
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : '加载用户设置失败' 
      });
      return null;
    }
  },
  
  // 更新用户设置
  updateUserSettings: async (settings: Partial<UserSettings>) => {
    try {
      const { userSettings } = get();
      
      if (!userSettings) {
        toast.error('用户未登录');
        return false;
      }
      
      // 准备更新数据
      const updateData: Record<string, string | boolean> = {};
      
      if (settings.nickname) updateData.nickname = settings.nickname;
      if (settings.avatar) updateData.avatar = settings.avatar;
      if (settings.theme) {
        updateData.theme = settings.theme;
        set({ theme: settings.theme });
        localStorage.setItem('theme', settings.theme);
      }
      if (settings.soundEnabled !== undefined) {
        updateData.sound_enabled = settings.soundEnabled;
        set({ soundEnabled: settings.soundEnabled });
        localStorage.setItem('sound_enabled', String(settings.soundEnabled));
      }
      
      // 更新数据库
      const { error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', userSettings.id);
        
      if (error) throw error;
      
      // 更新本地状态
      set({
        userSettings: {
          ...userSettings,
          ...settings
        }
      });
      
      return true;
    } catch (error) {
      console.error('更新用户设置失败:', error);
      toast.error(error instanceof Error ? error.message : '更新用户设置失败');
      return false;
    }
  },
  
  // 更新头像
  updateAvatar: (avatarUrl: string) => {
    set(state => ({
      userSettings: state.userSettings ? {
        ...state.userSettings,
        avatar: avatarUrl
      } : null
    }));
  },
  
  // 更新昵称
  updateNickname: (nickname: string) => {
    set(state => ({
      userSettings: state.userSettings ? {
        ...state.userSettings,
        nickname
      } : null
    }));
  },
  
  // 切换主题
  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: newTheme });
    localStorage.setItem('theme', newTheme);
    
    // 更新文档根元素的data-theme属性
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // 如果用户已登录，同步更新到数据库
    const { userSettings, updateUserSettings } = get();
    if (userSettings) {
      updateUserSettings({ theme: newTheme });
    }
  },
  
  // 切换声音
  toggleSound: () => {
    const newSoundEnabled = !get().soundEnabled;
    set({ soundEnabled: newSoundEnabled });
    localStorage.setItem('sound_enabled', String(newSoundEnabled));
    
    // 如果用户已登录，同步更新到数据库
    const { userSettings, updateUserSettings } = get();
    if (userSettings) {
      updateUserSettings({ soundEnabled: newSoundEnabled });
    }
  },
  
  // 清除用户数据
  clearUserData: () => {
    set({
      userSettings: null
    });
  },
  
  // 设置错误
  setError: (error: string | null) => {
    set({ error });
  }
}));