alter table public.karya
  add column if not exists alasan_penolakan text;

alter table public.riwayat_panitia
  add column if not exists alasan_penolakan text;

drop policy if exists "Works readable by staff in their scope"
  on public.karya;
create policy "Works readable by staff in their scope"
  on public.karya for select to authenticated
  using (
    (select public.current_profile_role()) = 'panitia'
    or (
      status in ('diverifikasi', 'ditolak')
      and (select public.current_profile_role()) = 'juri'
      and exists (
        select 1
        from public.peserta
        where peserta.id = karya.peserta_id
          and peserta.kategori = (select public.current_profile_kategori())
      )
    )
  );

drop policy if exists "Panitia reads status history"
  on public.riwayat_panitia;
drop policy if exists "Staff reads status history"
  on public.riwayat_panitia;
create policy "Staff reads status history"
  on public.riwayat_panitia for select to authenticated
  using ((select public.current_profile_role()) in ('panitia', 'juri'));

drop function if exists public.panitia_update_karya_status(uuid, text);

create or replace function public.panitia_update_karya_status(
  p_karya_id uuid,
  p_status text,
  p_alasan text default null
)
returns table (
  history_id uuid,
  status_lama text,
  status_baru text,
  waktu timestamptz,
  alasan_penolakan text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
  normalized_reason text;
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

  normalized_reason := nullif(trim(coalesce(p_alasan, '')), '');
  if p_status = 'ditolak'
    and (normalized_reason is null or length(normalized_reason) > 1000) then
    raise exception 'Alasan penolakan wajib diisi (maksimal 1000 karakter).';
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
      select null::uuid,
             current_status,
             current_status,
             now(),
             (select karya.alasan_penolakan
              from public.karya
              where karya.id = p_karya_id);
    return;
  end if;

  update public.karya
  set status = p_status,
      alasan_penolakan = case
        when p_status = 'ditolak' then normalized_reason
        else null
      end
  where id = p_karya_id;

  insert into public.riwayat_panitia (
    karya_id,
    panitia_id,
    status_lama,
    status_baru,
    alasan_penolakan
  )
  values (
    p_karya_id,
    auth.uid(),
    current_status,
    p_status,
    case when p_status = 'ditolak' then normalized_reason else null end
  )
  returning * into history_row;

  return query
    select history_row.id,
           history_row.status_lama,
           history_row.status_baru,
           history_row.waktu,
           history_row.alasan_penolakan;
end;
$$;

revoke all on function public.panitia_update_karya_status(uuid, text, text)
  from public, anon;
grant execute on function public.panitia_update_karya_status(uuid, text, text)
  to authenticated;
