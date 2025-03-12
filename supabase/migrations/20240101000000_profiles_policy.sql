create policy "用户只能管理自己的头像"
on storage.objects
for all using (
  bucket_id = 'avatars'
  and auth.uid()::text = regexp_replace(name, '-.*$', '')
);