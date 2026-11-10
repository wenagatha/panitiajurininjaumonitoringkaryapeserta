create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nama text not null,
  role text not null default 'pending'
    check (role in ('pending', 'panitia', 'juri')),
  kategori text
    check (kategori is null or kategori in ('cerita', 'komik')),
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  constraint profiles_role_category_check check (
    (role = 'juri' and kategori is not null)
    or (role in ('pending', 'panitia') and kategori is null)
  )
);

create table public.gform_import_raw (
  id bigint generated always as identity primary key,
  "Timestamp" text,
  "Email address" text,
  "Kategori Lomba" text,
  "Nama Lengkap (sesuai dengan Kartu Pelajar/Mahasiswa)" text,
  "Scan Kartu Pelajar/Mahasiswa" text,
  "Asal Sekolah/Perguruan Tinggi" text,
  "Email" text,
  "Kontak Whatsapp Aktif" text,
  "Karya Buku Cerita/Komik (file dalam bentuk format PDF)" text,
  "Lembar Pernyataan Keaslian Karya" text,
  imported_at timestamptz
);

create table public.peserta (
  id uuid primary key default gen_random_uuid(),
  source_row_id bigint unique references public.gform_import_raw (id),
  nama text not null,
  asal text not null,
  email text not null,
  whatsapp text not null,
  kategori text not null check (kategori in ('cerita', 'komik')),
  tanggal_daftar date not null default current_date,
  url_kartu text,
  created_at timestamptz not null default now()
);

create table public.karya (
  id uuid primary key default gen_random_uuid(),
  peserta_id uuid not null unique references public.peserta (id) on delete cascade,
  status text not null default 'menunggu'
    check (status in ('menunggu', 'diproses', 'diverifikasi', 'ditolak')),
  url_karya text,
  url_pernyataan text,
  created_at timestamptz not null default now()
);

create table public.tinjauan_juri (
  karya_id uuid not null references public.karya (id) on delete cascade,
  juri_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('sedang', 'sudah')),
  mulai_pada timestamptz not null default now(),
  terakhir_aktif timestamptz not null default now(),
  selesai_pada timestamptz,
  primary key (karya_id, juri_id)
);

create table public.pilihan_juri (
  karya_id uuid not null references public.karya (id) on delete cascade,
  juri_id uuid not null references public.profiles (id) on delete cascade,
  ditandai_pada timestamptz not null default now(),
  primary key (karya_id, juri_id)
);

create table public.peringkat_karya (
  karya_id uuid primary key references public.karya (id) on delete cascade,
  kategori text not null check (kategori in ('cerita', 'komik')),
  peringkat integer not null check (peringkat > 0),
  ditetapkan_oleh uuid not null references public.profiles (id),
  ditetapkan_pada timestamptz not null default now(),
  unique (kategori, peringkat)
);

create table public.riwayat_juri (
  id uuid primary key default gen_random_uuid(),
  jenis text not null check (
    jenis in (
      'jadikan-kandidat',
      'batalkan-kandidat',
      'tetapkan-peringkat',
      'pindah-peringkat',
      'hapus-peringkat'
    )
  ),
  karya_id uuid not null references public.karya (id) on delete cascade,
  juri_id uuid not null references public.profiles (id),
  nilai_lama text,
  nilai_baru text,
  waktu timestamptz not null default now(),
  catatan text
);

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function public.current_profile_kategori()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select kategori from public.profiles where id = (select auth.uid());
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Pengguna'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

create or replace function public.complete_staff_onboarding(p_nama text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Login diperlukan untuk melengkapi akun.';
  end if;
  if length(trim(coalesce(p_nama, ''))) < 2
    or length(trim(p_nama)) > 100 then
    raise exception 'Nama harus terdiri dari 2 sampai 100 karakter.';
  end if;

  update public.profiles
  set nama = trim(p_nama),
      must_change_password = false
  where id = (select auth.uid())
    and role in ('panitia', 'juri')
    and must_change_password = true;

  if not found then
    raise exception 'Profil tidak ditemukan atau pengaturan akun sudah selesai.';
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.gform_import_raw enable row level security;
alter table public.peserta enable row level security;
alter table public.karya enable row level security;
alter table public.tinjauan_juri enable row level security;
alter table public.pilihan_juri enable row level security;
alter table public.peringkat_karya enable row level security;
alter table public.riwayat_juri enable row level security;

create policy "Profiles readable by owner and panitia"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.current_profile_role()) = 'panitia');

create policy "CSV staging is accessible only through the dashboard"
  on public.gform_import_raw for all to authenticated
  using (false) with check (false);

create policy "Participants readable by staff in their scope"
  on public.peserta for select to authenticated
  using (
    (select public.current_profile_role()) = 'panitia'
    or (
      (select public.current_profile_role()) = 'juri'
      and kategori = (select public.current_profile_kategori())
    )
  );

create policy "Panitia manages participants"
  on public.peserta for all to authenticated
  using ((select public.current_profile_role()) = 'panitia')
  with check ((select public.current_profile_role()) = 'panitia');

create policy "Works readable by staff in their scope"
  on public.karya for select to authenticated
  using (
    (select public.current_profile_role()) = 'panitia'
    or (
      status = 'diverifikasi'
      and (select public.current_profile_role()) = 'juri'
      and exists (
        select 1
        from public.peserta
        where peserta.id = karya.peserta_id
          and peserta.kategori = (select public.current_profile_kategori())
      )
    )
  );

create policy "Panitia manages works"
  on public.karya for all to authenticated
  using ((select public.current_profile_role()) = 'panitia')
  with check ((select public.current_profile_role()) = 'panitia');

create policy "Reviews readable by staff in their scope"
  on public.tinjauan_juri for select to authenticated
  using (
    (select public.current_profile_role()) = 'panitia'
    or (
      (select public.current_profile_role()) = 'juri'
      and exists (
        select 1
        from public.karya
        join public.peserta on peserta.id = karya.peserta_id
        where karya.id = tinjauan_juri.karya_id
          and peserta.kategori = (select public.current_profile_kategori())
      )
    )
  );

create policy "Juri manages own reviews"
  on public.tinjauan_juri for all to authenticated
  using (
    juri_id = (select auth.uid())
    and (select public.current_profile_role()) = 'juri'
    and exists (
      select 1
      from public.karya
      join public.peserta on peserta.id = karya.peserta_id
      where karya.id = tinjauan_juri.karya_id
        and peserta.kategori = (select public.current_profile_kategori())
    )
  )
  with check (
    juri_id = (select auth.uid())
    and (select public.current_profile_role()) = 'juri'
    and exists (
      select 1
      from public.karya
      join public.peserta on peserta.id = karya.peserta_id
      where karya.id = tinjauan_juri.karya_id
        and peserta.kategori = (select public.current_profile_kategori())
    )
  );

create policy "Jury selections readable by staff in their scope"
  on public.pilihan_juri for select to authenticated
  using (
    (select public.current_profile_role()) = 'panitia'
    or (
      (select public.current_profile_role()) = 'juri'
      and exists (
        select 1
        from public.karya
        join public.peserta on peserta.id = karya.peserta_id
        where karya.id = pilihan_juri.karya_id
          and peserta.kategori = (select public.current_profile_kategori())
      )
    )
  );

create policy "Juri manages own selections"
  on public.pilihan_juri for all to authenticated
  using (
    juri_id = (select auth.uid())
    and (select public.current_profile_role()) = 'juri'
    and exists (
      select 1
      from public.karya
      join public.peserta on peserta.id = karya.peserta_id
      where karya.id = pilihan_juri.karya_id
        and peserta.kategori = (select public.current_profile_kategori())
    )
  )
  with check (
    juri_id = (select auth.uid())
    and (select public.current_profile_role()) = 'juri'
    and exists (
      select 1
      from public.karya
      join public.peserta on peserta.id = karya.peserta_id
      where karya.id = pilihan_juri.karya_id
        and peserta.kategori = (select public.current_profile_kategori())
    )
  );

create policy "Ranks readable by staff in their scope"
  on public.peringkat_karya for select to authenticated
  using (
    (select public.current_profile_role()) = 'panitia'
    or (
      (select public.current_profile_role()) = 'juri'
      and kategori = (select public.current_profile_kategori())
    )
  );

create policy "Juri manages ranks for own category"
  on public.peringkat_karya for all to authenticated
  using (
    (select public.current_profile_role()) = 'juri'
    and ditetapkan_oleh = (select auth.uid())
    and kategori = (select public.current_profile_kategori())
  )
  with check (
    (select public.current_profile_role()) = 'juri'
    and ditetapkan_oleh = (select auth.uid())
    and kategori = (select public.current_profile_kategori())
    and exists (
      select 1
      from public.pilihan_juri
      where pilihan_juri.karya_id = peringkat_karya.karya_id
        and pilihan_juri.juri_id = (select auth.uid())
    )
  );

create policy "History readable by staff in their scope"
  on public.riwayat_juri for select to authenticated
  using (
    (select public.current_profile_role()) = 'panitia'
    or (
      (select public.current_profile_role()) = 'juri'
      and exists (
        select 1
        from public.karya
        join public.peserta on peserta.id = karya.peserta_id
        where karya.id = riwayat_juri.karya_id
          and peserta.kategori = (select public.current_profile_kategori())
      )
    )
  );

create policy "Juri records own history"
  on public.riwayat_juri for insert to authenticated
  with check (
    juri_id = (select auth.uid())
    and (select public.current_profile_role()) = 'juri'
    and exists (
      select 1
      from public.karya
      join public.peserta on peserta.id = karya.peserta_id
      where karya.id = riwayat_juri.karya_id
        and peserta.kategori = (select public.current_profile_kategori())
    )
  );

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.peserta, public.karya to authenticated;
grant select, insert, update, delete
  on public.tinjauan_juri, public.pilihan_juri, public.peringkat_karya, public.riwayat_juri
  to authenticated;

create or replace function public.import_google_form_csv()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  imported_count integer;
begin
  if exists (
    select 1
    from public.gform_import_raw
    where imported_at is null
      and (
        coalesce(trim("Nama Lengkap (sesuai dengan Kartu Pelajar/Mahasiswa)"), '') = ''
        or coalesce(trim("Asal Sekolah/Perguruan Tinggi"), '') = ''
        or coalesce(trim("Kontak Whatsapp Aktif"), '') = ''
        or coalesce(
          nullif(trim("Email"), ''),
          nullif(trim("Email address"), ''),
          ''
        ) = ''
        or (
          lower(trim(coalesce("Kategori Lomba", ''))) not like '%cerita%'
          and lower(trim(coalesce("Kategori Lomba", ''))) not like '%komik%'
        )
      )
  ) then
    raise exception 'CSV berisi baris tanpa nama, asal, kontak, email, atau kategori cerita/komik yang dikenali.';
  end if;

  with inserted_participants as (
    insert into public.peserta (
      source_row_id,
      nama,
      asal,
      email,
      whatsapp,
      kategori,
      tanggal_daftar,
      url_kartu
    )
    select
      source.id,
      trim(source."Nama Lengkap (sesuai dengan Kartu Pelajar/Mahasiswa)"),
      trim(source."Asal Sekolah/Perguruan Tinggi"),
      trim(coalesce(
        nullif(trim(source."Email"), ''),
        nullif(trim(source."Email address"), '')
      )),
      trim(source."Kontak Whatsapp Aktif"),
      case
        when lower(trim(source."Kategori Lomba")) like '%cerita%' then 'cerita'
        when lower(trim(source."Kategori Lomba")) like '%komik%' then 'komik'
      end,
      coalesce(
        case
          when trim(source."Timestamp") ~ '^\d{1,2}/\d{1,2}/\d{4}'
            then to_date(
              split_part(trim(source."Timestamp"), ' ', 1),
              'DD/MM/YYYY'
            )
          else nullif(trim(source."Timestamp"), '')::timestamptz::date
        end,
        current_date
      ),
      nullif(trim(source."Scan Kartu Pelajar/Mahasiswa"), '')
    from public.gform_import_raw as source
    where source.imported_at is null
    on conflict (source_row_id) do nothing
    returning id, source_row_id
  ),
  inserted_works as (
    insert into public.karya (peserta_id, url_karya, url_pernyataan)
    select
      participant.id,
      nullif(trim(source."Karya Buku Cerita/Komik (file dalam bentuk format PDF)"), ''),
      nullif(trim(source."Lembar Pernyataan Keaslian Karya"), '')
    from inserted_participants as participant
    join public.gform_import_raw as source on source.id = participant.source_row_id
    on conflict (peserta_id) do nothing
    returning peserta_id
  )
  update public.gform_import_raw as source
  set imported_at = now()
  where source.id in (select source_row_id from inserted_participants);

  get diagnostics imported_count = row_count;
  return imported_count;
end;
$$;

revoke all on function public.import_google_form_csv() from public, anon, authenticated;
revoke all on function public.current_profile_role() from public, anon;
revoke all on function public.current_profile_kategori() from public, anon;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_profile_kategori() to authenticated;
revoke all on function public.complete_staff_onboarding(text) from public, anon;
grant execute on function public.complete_staff_onboarding(text) to authenticated;
