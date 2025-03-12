create table profiles (
  id uuid primary key references auth.users(id),
  avatar_url text,
  updated_at timestamp with time zone default now()
);