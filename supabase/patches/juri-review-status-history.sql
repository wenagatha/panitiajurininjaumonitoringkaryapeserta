create table if not exists public.riwayat_tinjauan_juri (
  id uuid primary key default gen_random_uuid(),
  karya_id uuid not null references public.karya (id) on delete cascade,
  juri_id uuid not null references public.profiles (id) on delete cascade,
  status_lama text not null check (status_lama in ('belum', 'sedang', 'sudah')),
  status_baru text not null check (status_baru in ('belum', 'sedang', 'sudah')),
  waktu timestamptz not null default now()
);

alter table public.riwayat_tinjauan_juri enable row level security;

create or replace function public.record_juri_review_status_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_status text;
  new_status text;
  tracked_karya_id uuid;
  tracked_juri_id uuid;
begin
  if tg_op = 'INSERT' then
    old_status := 'belum';
    new_status := new.status;
    tracked_karya_id := new.karya_id;
    tracked_juri_id := new.juri_id;
  elsif tg_op = 'UPDATE' then
    old_status := case
      when old.status = 'sedang'
        and now() - old.terakhir_aktif > interval '5 minutes'
        then 'belum'
      else old.status
    end;
    new_status := case
      when new.status = 'sedang'
        and now() - new.terakhir_aktif > interval '5 minutes'
        then 'belum'
      else new.status
    end;
    tracked_karya_id := new.karya_id;
    tracked_juri_id := new.juri_id;
  elsif tg_op = 'DELETE' then
    old_status := case
      when old.status = 'sedang'
        and now() - old.terakhir_aktif > interval '5 minutes'
        then 'belum'
      else old.status
    end;
    new_status := 'belum';
    tracked_karya_id := old.karya_id;
    tracked_juri_id := old.juri_id;
  else
    raise exception 'Perubahan status tinjauan tidak valid.';
  end if;

  if old_status is distinct from new_status then
    insert into public.riwayat_tinjauan_juri (
      karya_id, juri_id, status_lama, status_baru
    )
    values (
      tracked_karya_id, tracked_juri_id, old_status, new_status
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists record_juri_review_status_history
  on public.tinjauan_juri;
create trigger record_juri_review_status_history
  after insert or update or delete on public.tinjauan_juri
  for each row execute function public.record_juri_review_status_history();

drop policy if exists "Official review history readable by staff"
  on public.riwayat_tinjauan_juri;
create policy "Official review history readable by staff"
  on public.riwayat_tinjauan_juri for select to authenticated
  using (
    exists (
      select 1
      from public.karya as work
      join public.peserta as participant
        on participant.id = work.peserta_id
      where work.id = riwayat_tinjauan_juri.karya_id
        and exists (
          select 1
          from public.get_official_juri_profiles(participant.kategori)
            as official_juri
          where official_juri.id = riwayat_tinjauan_juri.juri_id
        )
        and (
          (select public.current_profile_role()) = 'panitia'
          or (
            (select public.current_profile_role()) = 'juri'
            and participant.kategori =
              (select public.current_profile_kategori())
          )
        )
    )
  );

revoke all on public.riwayat_tinjauan_juri from public, anon, authenticated;
grant select on public.riwayat_tinjauan_juri to authenticated;

create or replace function public.juri_set_review_status(
  p_karya_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  work_category text;
begin
  if auth.uid() is null
    or coalesce((select public.current_profile_role()), '') <> 'juri' then
    raise exception 'Hanya juri yang dapat mengubah status tinjauannya.';
  end if;

  if p_status is null or p_status not in ('belum', 'sedang', 'sudah') then
    raise exception 'Status tinjauan tidak valid.';
  end if;

  select participant.kategori
  into work_category
  from public.karya as work
  join public.peserta as participant
    on participant.id = work.peserta_id
  where work.id = p_karya_id
    and work.status = 'diverifikasi';

  if not found
    or work_category is distinct from
      (select public.current_profile_kategori()) then
    raise exception 'Karya tidak tersedia untuk kategori juri ini.';
  end if;

  if not exists (
    select 1
    from public.get_official_juri_profiles(work_category) as official_juri
    where official_juri.id = auth.uid()
  ) then
    raise exception 'Akun ini bukan juri resmi kategori tersebut.';
  end if;

  if p_status = 'belum' then
    delete from public.tinjauan_juri
    where karya_id = p_karya_id
      and juri_id = auth.uid();
  elsif p_status = 'sedang' then
    insert into public.tinjauan_juri (
      karya_id, juri_id, status, mulai_pada, terakhir_aktif, selesai_pada
    )
    values (p_karya_id, auth.uid(), 'sedang', now(), now(), null)
    on conflict (karya_id, juri_id) do update
      set status = 'sedang',
          mulai_pada = case
            when public.tinjauan_juri.status = 'sedang'
              and now() - public.tinjauan_juri.terakhir_aktif
                <= interval '5 minutes'
              then public.tinjauan_juri.mulai_pada
            else now()
          end,
          terakhir_aktif = now(),
          selesai_pada = null;
  else
    insert into public.tinjauan_juri (
      karya_id, juri_id, status, mulai_pada, terakhir_aktif, selesai_pada
    )
    values (p_karya_id, auth.uid(), 'sudah', now(), now(), now())
    on conflict (karya_id, juri_id) do update
      set status = 'sudah',
          terakhir_aktif = now(),
          selesai_pada = now();
  end if;
end;
$$;

revoke all on function public.juri_set_review_status(uuid, text)
  from public, anon;
grant execute on function public.juri_set_review_status(uuid, text)
  to authenticated;

notify pgrst, 'reload schema';
