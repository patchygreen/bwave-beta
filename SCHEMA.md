# Bwave Database Schema

Run these SQL queries in your Supabase project (SQL Editor) to set up the required tables.

## 1. Enable Auth

Supabase Auth is enabled by default when you create a project.

## 2. Create profiles table

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table profiles enable row level security;

-- Allow users to read/write their own profile
create policy "Users can read their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);
```

## 3. Create uploads table

```sql
create table uploads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text not null check (file_type in ('pdf', 'image')),
  created_at timestamp with time zone default now()
);

create index uploads_profile_id_idx on uploads(profile_id);

-- Enable RLS
alter table uploads enable row level security;

create policy "Users can read their own uploads"
  on uploads for select
  using (auth.uid() = profile_id);

create policy "Users can insert their own uploads"
  on uploads for insert
  with check (auth.uid() = profile_id);
```

## 4. Create product_waves table

```sql
create table product_waves (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references uploads(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  extracted_data jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index product_waves_profile_id_idx on product_waves(profile_id);
create index product_waves_upload_id_idx on product_waves(upload_id);

-- Enable RLS
alter table product_waves enable row level security;

create policy "Users can read their own waves"
  on product_waves for select
  using (auth.uid() = profile_id);

create policy "Users can insert their own waves"
  on product_waves for insert
  with check (auth.uid() = profile_id);

create policy "Users can update their own waves"
  on product_waves for update
  using (auth.uid() = profile_id);
```

## 5. Create csv_exports table

```sql
create table csv_exports (
  id uuid primary key default gen_random_uuid(),
  wave_id uuid not null references product_waves(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  csv_path text not null,
  created_at timestamp with time zone default now()
);

create index csv_exports_profile_id_idx on csv_exports(profile_id);
create index csv_exports_wave_id_idx on csv_exports(wave_id);

-- Enable RLS
alter table csv_exports enable row level security;

create policy "Users can read their own exports"
  on csv_exports for select
  using (auth.uid() = profile_id);

create policy "Users can insert their own exports"
  on csv_exports for insert
  with check (auth.uid() = profile_id);
```

## 6. Set up Storage bucket

In the Supabase dashboard (Storage tab):
1. Create a new bucket called `uploads`
2. Set it to Private
3. Add a policy to allow authenticated users to upload and read files in their own folder

Or use this SQL:

```sql
create policy "Users can upload files to their folder"
  on storage.objects for insert
  with check (
    bucket_id = 'uploads' and
    auth.uid()::text = split_part(name, '/', 1)
  );

create policy "Users can read files from their folder"
  on storage.objects for select
  using (
    bucket_id = 'uploads' and
    auth.uid()::text = split_part(name, '/', 1)
  );
```

## Notes

- All tables use UUID primary keys
- Row Level Security (RLS) is enabled to ensure users can only access their own data
- Indexes are added on foreign keys for query performance
- `extracted_data` in `product_waves` stores the JSON directly from Claude
