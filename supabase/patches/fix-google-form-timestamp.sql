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
