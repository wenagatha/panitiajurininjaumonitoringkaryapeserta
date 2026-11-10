begin;

do $$
begin
  if exists (
    with ranked as (
      select
        p.id as peserta_id,
        karya.id as karya_id,
        row_number() over (
          partition by lower(trim(p.email)), p.kategori
          order by
            case
              when trim(raw."Timestamp") ~ '^\d{1,2}/\d{1,2}/\d{4}'
                then to_timestamp(
                  split_part(trim(raw."Timestamp"), ' ', 1)
                  || ' '
                  || coalesce(
                    nullif(split_part(trim(raw."Timestamp"), ' ', 2), ''),
                    '00:00:00'
                  ),
                  'DD/MM/YYYY HH24:MI:SS'
                )
              else nullif(trim(raw."Timestamp"), '')::timestamptz
            end desc nulls last,
            p.source_row_id desc
        ) as urutan
      from public.peserta as p
      join public.gform_import_raw as raw on raw.id = p.source_row_id
      left join public.karya as karya on karya.peserta_id = p.id
      where p.source_row_id is not null
    )
    select 1
    from ranked
    where urutan > 1
      and (
        exists (
          select 1
          from public.tinjauan_juri
          where karya_id = ranked.karya_id
        )
        or exists (
          select 1
          from public.pilihan_juri
          where karya_id = ranked.karya_id
        )
        or exists (
          select 1
          from public.peringkat_karya
          where karya_id = ranked.karya_id
        )
        or exists (
          select 1
          from public.riwayat_juri
          where karya_id = ranked.karya_id
        )
      )
  ) then
    raise exception 'Penghapusan dibatalkan: kiriman lama memiliki aktivitas juri. Tinjau data tersebut sebelum menghapus.';
  end if;
end;
$$;

with ranked as (
  select
    p.id as peserta_id,
    row_number() over (
      partition by lower(trim(p.email)), p.kategori
      order by
        case
          when trim(raw."Timestamp") ~ '^\d{1,2}/\d{1,2}/\d{4}'
            then to_timestamp(
              split_part(trim(raw."Timestamp"), ' ', 1)
              || ' '
              || coalesce(
                nullif(split_part(trim(raw."Timestamp"), ' ', 2), ''),
                '00:00:00'
              ),
              'DD/MM/YYYY HH24:MI:SS'
            )
          else nullif(trim(raw."Timestamp"), '')::timestamptz
        end desc nulls last,
        p.source_row_id desc
    ) as urutan
  from public.peserta as p
  join public.gform_import_raw as raw on raw.id = p.source_row_id
  where p.source_row_id is not null
),
removed as (
  delete from public.peserta as p
  using ranked
  where p.id = ranked.peserta_id
    and ranked.urutan > 1
  returning p.id
)
select count(*) as kiriman_lama_dihapus
from removed;

commit;
