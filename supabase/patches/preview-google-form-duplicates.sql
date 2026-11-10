with duplicate_groups as (
  select
    lower(trim(p.email)) as normalized_email,
    p.kategori,
    count(*) as jumlah_kiriman,
    min(
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
      end
    ) as timestamp_terlama,
    max(
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
      end
    ) as timestamp_terbaru
  from public.peserta as p
  join public.gform_import_raw as raw on raw.id = p.source_row_id
  where p.source_row_id is not null
  group by lower(trim(p.email)), p.kategori
  having count(*) > 1
)
select
  case
    when position('@' in normalized_email) > 1 then
      left(split_part(normalized_email, '@', 1), 1)
      || '***@'
      || split_part(normalized_email, '@', 2)
    else '***'
  end as email_disamarkan,
  kategori,
  jumlah_kiriman,
  timestamp_terlama,
  timestamp_terbaru
from duplicate_groups
order by jumlah_kiriman desc, kategori, email_disamarkan;
