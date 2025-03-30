create policy "用户只能管理自己的头像"
on storage.objects
for all using (
  bucket_id = 'avatars'
  and auth.uid()::text = regexp_replace(name, '-.*$', '')
);

-- 启用 Row Level Security
alter table profiles enable row level security;

-- 创建策略：用户可以查看所有配置文件
create policy "Profiles are viewable by everyone"
  on profiles for select
  using ( true );

-- 创建策略：用户只能编辑自己的配置文件
create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- 创建策略：用户只能插入自己的配置文件
create policy "Users can insert own profile"
  on profiles for insert
  with check ( auth.uid() = id );

-- 创建策略：只有系统管理员可以删除配置文件
create policy "Only admins can delete profiles"
  on profiles for delete
  using ( 
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role = 'admin'
    )
  );