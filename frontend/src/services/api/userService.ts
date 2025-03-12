import { supabase } from '../supabase';
import { Customer } from '../../types/index';

export const UserService = {
  // 获取所有用户
  async getUsers(): Promise<Customer[]> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('获取用户失败:', error);
      throw error;
    }
  },
  
  // 获取单个用户
  async getUserById(id: string): Promise<Customer | null> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('获取用户失败:', error);
      throw error;
    }
  },
  
  // 更新用户信息
  async updateUser(id: string, userData: Partial<Customer>): Promise<Customer> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(userData)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('更新用户失败:', error);
      throw error;
    }
  }
};