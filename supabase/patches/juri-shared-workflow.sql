create or replace function public.juri_review_action(
  p_karya_id uuid,
  p_action text
)
returns table (
  review_status text,
  mulai_pada timestamptz,
  terakhir_aktif timestamptz,
  selesai_pada timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  work_category text;
  review_row public.tinjauan_juri;
begin
  if auth.uid() is null
    or coalesce((select public.current_profile_role()), '') <> 'juri' then
    raise exception 'Hanya juri yang dapat mencatat tinjauan.';
  end if;

  select participant.kategori
  into work_category
  from public.karya as work
  join public.peserta as participant on participant.id = work.peserta_id
  where work.id = p_karya_id
    and work.status = 'diverifikasi';

  if not found
    or work_category is distinct from (select public.current_profile_kategori()) then
    raise exception 'Karya tidak tersedia untuk kategori juri ini.';
  end if;

  if p_action = 'start' then
    insert into public.tinjauan_juri (
      karya_id, juri_id, status, mulai_pada, terakhir_aktif, selesai_pada
    )
    values (p_karya_id, auth.uid(), 'sedang', now(), now(), null)
    on conflict (karya_id, juri_id) do update
      set status = case
            when public.tinjauan_juri.status = 'sudah' then 'sudah'
            else 'sedang'
          end,
          mulai_pada = case
            when public.tinjauan_juri.status = 'sudah'
              then public.tinjauan_juri.mulai_pada
            when now() - public.tinjauan_juri.terakhir_aktif > interval '5 minutes'
              then now()
            else public.tinjauan_juri.mulai_pada
          end,
          terakhir_aktif = now(),
          selesai_pada = case
            when public.tinjauan_juri.status = 'sudah'
              then public.tinjauan_juri.selesai_pada
            else null
          end
      returning * into review_row;
  elsif p_action = 'heartbeat' then
    update public.tinjauan_juri
    set terakhir_aktif = now()
    where karya_id = p_karya_id
      and juri_id = auth.uid()
      and status = 'sedang'
      and now() - terakhir_aktif <= interval '5 minutes'
    returning * into review_row;
  elsif p_action = 'finish' then
    delete from public.tinjauan_juri
    where karya_id = p_karya_id
      and juri_id = auth.uid()
      and status = 'sedang';
    return;
  elsif p_action = 'mark_done' then
    insert into public.tinjauan_juri (
      karya_id, juri_id, status, mulai_pada, terakhir_aktif, selesai_pada
    )
    values (p_karya_id, auth.uid(), 'sudah', now(), now(), now())
    on conflict (karya_id, juri_id) do update
      set status = 'sudah',
          terakhir_aktif = now(),
          selesai_pada = now()
    returning * into review_row;
  elsif p_action = 'unmark_done' then
    delete from public.tinjauan_juri
    where karya_id = p_karya_id
      and juri_id = auth.uid()
      and status = 'sudah';
    return;
  else
    raise exception 'Aksi tinjauan tidak valid.';
  end if;

  return query
    select review_row.status,
           review_row.mulai_pada,
           review_row.terakhir_aktif,
           review_row.selesai_pada;
end;
$$;

create or replace function public.juri_toggle_candidate(
  p_karya_id uuid,
  p_selected boolean,
  p_delete_rank boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  work_category text;
  rank_row public.peringkat_karya;
  candidate_count integer;
begin
  if auth.uid() is null
    or coalesce((select public.current_profile_role()), '') <> 'juri' then
    raise exception 'Hanya juri yang dapat memilih kandidat.';
  end if;

  select participant.kategori
  into work_category
  from public.karya as work
  join public.peserta as participant on participant.id = work.peserta_id
  where work.id = p_karya_id
    and work.status = 'diverifikasi';

  if not found
    or work_category is distinct from (select public.current_profile_kategori()) then
    raise exception 'Karya tidak tersedia untuk kategori juri ini.';
  end if;

  perform pg_advisory_xact_lock(hashtext('juri-candidates-' || work_category));

  if p_selected then
    if not exists (
      select 1 from public.tinjauan_juri
      where karya_id = p_karya_id
        and juri_id = auth.uid()
        and status = 'sudah'
    ) then
      raise exception 'Tandai sudah ditinjau sebelum memilih kandidat.';
    end if;

    if exists (
      select 1 from public.pilihan_juri
      where karya_id = p_karya_id and juri_id = auth.uid()
    ) then
      return;
    end if;

    select count(distinct choice.karya_id)
    into candidate_count
    from public.pilihan_juri as choice
    join public.karya as work on work.id = choice.karya_id
    join public.peserta as participant on participant.id = work.peserta_id
    where participant.kategori = work_category
      and work.status = 'diverifikasi';

    if candidate_count >= (
      case work_category when 'cerita' then 13 else 10 end
    ) then
      raise exception 'Kuota kandidat penuh.';
    end if;

    insert into public.pilihan_juri (karya_id, juri_id)
    values (p_karya_id, auth.uid());
    insert into public.riwayat_juri (
      jenis, karya_id, juri_id, nilai_lama, nilai_baru
    )
    values (
      'jadikan-kandidat', p_karya_id, auth.uid(), null, 'kandidat'
    );
    return;
  end if;

  delete from public.pilihan_juri
  where karya_id = p_karya_id and juri_id = auth.uid();
  if not found then
    return;
  end if;

  insert into public.riwayat_juri (
    jenis, karya_id, juri_id, nilai_lama, nilai_baru
  )
  values (
    'batalkan-kandidat', p_karya_id, auth.uid(), 'kandidat', null
  );

  if not exists (
    select 1 from public.pilihan_juri where karya_id = p_karya_id
  ) then
    perform pg_advisory_xact_lock(hashtext('juri-ranks-' || work_category));

    select * into rank_row
    from public.peringkat_karya
    where karya_id = p_karya_id
    for update;

    if found then
      if not p_delete_rank then
        raise exception 'Membatalkan pilihan terakhir juga menghapus peringkat %.', rank_row.peringkat;
      end if;
      delete from public.peringkat_karya where karya_id = p_karya_id;
      insert into public.riwayat_juri (
        jenis, karya_id, juri_id, nilai_lama, nilai_baru, catatan
      )
      values (
        'hapus-peringkat', p_karya_id, auth.uid(),
        rank_row.peringkat::text, null, 'Kandidat terakhir dibatalkan'
      );
    end if;
  end if;
end;
$$;

create or replace function public.juri_set_rank(
  p_karya_id uuid,
  p_rank integer,
  p_replace_occupant boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  work_category text;
  old_rank public.peringkat_karya;
  occupant public.peringkat_karya;
  max_rank integer;
begin
  if auth.uid() is null
    or coalesce((select public.current_profile_role()), '') <> 'juri' then
    raise exception 'Hanya juri yang dapat menetapkan peringkat.';
  end if;

  select participant.kategori
  into work_category
  from public.karya as work
  join public.peserta as participant on participant.id = work.peserta_id
  where work.id = p_karya_id
    and work.status = 'diverifikasi';

  if not found
    or work_category is distinct from (select public.current_profile_kategori()) then
    raise exception 'Karya tidak tersedia untuk kategori juri ini.';
  end if;

  max_rank := case work_category when 'cerita' then 10 else 3 end;
  if p_rank is null or p_rank < 1 or p_rank > max_rank then
    raise exception 'Peringkat harus antara 1 dan %.', max_rank;
  end if;
  if not exists (
    select 1 from public.pilihan_juri where karya_id = p_karya_id
  ) then
    raise exception 'Karya harus menjadi kandidat sebelum diberi peringkat.';
  end if;

  perform pg_advisory_xact_lock(hashtext('juri-ranks-' || work_category));

  select * into old_rank
  from public.peringkat_karya
  where karya_id = p_karya_id
  for update;

  if old_rank.peringkat = p_rank then
    return;
  end if;

  select * into occupant
  from public.peringkat_karya
  where kategori = work_category and peringkat = p_rank
  for update;

  if found and not p_replace_occupant then
    raise exception 'Peringkat % sudah ditempati karya lain.', p_rank;
  end if;
  if found then
    delete from public.peringkat_karya where karya_id = occupant.karya_id;
    insert into public.riwayat_juri (
      jenis, karya_id, juri_id, nilai_lama, nilai_baru, catatan
    )
    values (
      'hapus-peringkat', occupant.karya_id, auth.uid(),
      occupant.peringkat::text, null, 'Peringkat diganti setelah musyawarah'
    );
  end if;

  if old_rank.karya_id is not null then
    update public.peringkat_karya
    set peringkat = p_rank,
        ditetapkan_oleh = auth.uid(),
        ditetapkan_pada = now()
    where karya_id = p_karya_id;
    insert into public.riwayat_juri (
      jenis, karya_id, juri_id, nilai_lama, nilai_baru
    )
    values (
      'pindah-peringkat', p_karya_id, auth.uid(),
      old_rank.peringkat::text, p_rank::text
    );
  else
    insert into public.peringkat_karya (
      karya_id, kategori, peringkat, ditetapkan_oleh
    )
    values (p_karya_id, work_category, p_rank, auth.uid());
    insert into public.riwayat_juri (
      jenis, karya_id, juri_id, nilai_lama, nilai_baru
    )
    values (
      'tetapkan-peringkat', p_karya_id, auth.uid(), null, p_rank::text
    );
  end if;
end;
$$;

create or replace function public.juri_clear_rank(p_karya_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rank_row public.peringkat_karya;
begin
  if auth.uid() is null
    or coalesce((select public.current_profile_role()), '') <> 'juri'
    or (select public.current_profile_kategori()) is null then
    raise exception 'Hanya juri yang dapat mengosongkan peringkat.';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(
      'juri-ranks-' || (select public.current_profile_kategori())
    )
  );

  delete from public.peringkat_karya
  where karya_id = p_karya_id
    and kategori = (select public.current_profile_kategori())
  returning * into rank_row;

  if rank_row.karya_id is null then
    return;
  end if;

  insert into public.riwayat_juri (
    jenis, karya_id, juri_id, nilai_lama, nilai_baru, catatan
  )
  values (
    'hapus-peringkat', p_karya_id, auth.uid(),
    rank_row.peringkat::text, null, 'Dikosongkan manual'
  );
end;
$$;

revoke all on function public.juri_review_action(uuid, text) from public, anon;
revoke all on function public.juri_toggle_candidate(uuid, boolean, boolean) from public, anon;
revoke all on function public.juri_set_rank(uuid, integer, boolean) from public, anon;
revoke all on function public.juri_clear_rank(uuid) from public, anon;
grant execute on function public.juri_review_action(uuid, text) to authenticated;
grant execute on function public.juri_toggle_candidate(uuid, boolean, boolean) to authenticated;
grant execute on function public.juri_set_rank(uuid, integer, boolean) to authenticated;
grant execute on function public.juri_clear_rank(uuid) to authenticated;

revoke insert, update, delete on public.tinjauan_juri,
  public.pilihan_juri, public.peringkat_karya, public.riwayat_juri
  from authenticated;

drop policy if exists "Juri reads profiles in their category" on public.profiles;
create policy "Juri reads profiles in their category"
  on public.profiles for select to authenticated
  using (
    (select public.current_profile_role()) = 'juri'
    and role = 'juri'
    and kategori = (select public.current_profile_kategori())
  );
