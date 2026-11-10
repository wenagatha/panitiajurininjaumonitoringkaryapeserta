create table if not exists public.riwayat_panitia (
  id uuid primary key default gen_random_uuid(),
  karya_id uuid not null references public.karya (id),
  panitia_id uuid not null references public.profiles (id),
  status_lama text not null check (
    status_lama in ('menunggu', 'diproses', 'diverifikasi', 'ditolak')
  ),
  status_baru text not null check (
    status_baru in ('menunggu', 'diproses', 'diverifikasi', 'ditolak')
  ),
  waktu timestamptz not null default now()
);

create index if not exists riwayat_panitia_karya_waktu_idx
  on public.riwayat_panitia (karya_id, waktu desc);

alter table public.riwayat_panitia enable row level security;

drop policy if exists "Panitia reads status history"
  on public.riwayat_panitia;
create policy "Panitia reads status history"
  on public.riwayat_panitia for select to authenticated
  using ((select public.current_profile_role()) = 'panitia');

grant select on public.riwayat_panitia to authenticated;
revoke insert, update, delete on public.riwayat_panitia from authenticated;

revoke update on public.karya from authenticated;

create or replace function public.panitia_update_karya_status(
  p_karya_id uuid,
  p_status text
)
returns table (
  history_id uuid,
  status_lama text,
  status_baru text,
  waktu timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
  history_row public.riwayat_panitia;
begin
  if auth.uid() is null
    or coalesce((select public.current_profile_role()), '') <> 'panitia' then
    raise exception 'Hanya panitia yang dapat mengubah status karya.';
  end if;

  if p_status is null
    or p_status not in ('menunggu', 'diproses', 'diverifikasi', 'ditolak') then
    raise exception 'Status karya tidak valid.';
  end if;

  select karya.status
  into current_status
  from public.karya
  where karya.id = p_karya_id
  for update;

  if not found then
    raise exception 'Karya tidak ditemukan.';
  end if;

  if current_status = p_status then
    return query
      select null::uuid, current_status, current_status, now();
    return;
  end if;

  update public.karya
  set status = p_status
  where id = p_karya_id;

  insert into public.riwayat_panitia (
    karya_id,
    panitia_id,
    status_lama,
    status_baru
  )
  values (
    p_karya_id,
    auth.uid(),
    current_status,
    p_status
  )
  returning * into history_row;

  return query
    select history_row.id,
           history_row.status_lama,
           history_row.status_baru,
           history_row.waktu;
end;
$$;

revoke all on function public.panitia_update_karya_status(uuid, text)
  from public, anon;
grant execute on function public.panitia_update_karya_status(uuid, text)
  to authenticated;
