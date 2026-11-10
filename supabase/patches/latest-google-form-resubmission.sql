create or replace function public.import_google_form_csv()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  submission record;
  existing_participant_id uuid;
  existing_submitted_at timestamptz;
  processed_count integer := 0;
  submitted_at timestamptz;
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

  if exists (
    select 1
    from public.peserta
    where source_row_id is not null
    group by lower(trim(email)), kategori
    having count(*) > 1
  ) then
    raise exception 'Sudah ada kiriman ganda di tabel peserta. Jalankan preview-google-form-duplicates.sql dan tinjau hasilnya sebelum impor berikutnya.';
  end if;

  for submission in
    with normalized as (
      select
        source.id,
        source."Timestamp" as timestamp_text,
        source."Nama Lengkap (sesuai dengan Kartu Pelajar/Mahasiswa)" as nama,
        source."Asal Sekolah/Perguruan Tinggi" as asal,
        coalesce(
          nullif(trim(source."Email"), ''),
          nullif(trim(source."Email address"), '')
        ) as email,
        source."Kontak Whatsapp Aktif" as whatsapp,
        source."Scan Kartu Pelajar/Mahasiswa" as url_kartu,
        source."Karya Buku Cerita/Komik (file dalam bentuk format PDF)" as url_karya,
        source."Lembar Pernyataan Keaslian Karya" as url_pernyataan,
        case
          when lower(trim(source."Kategori Lomba")) like '%cerita%' then 'cerita'
          when lower(trim(source."Kategori Lomba")) like '%komik%' then 'komik'
        end as kategori,
        case
          when trim(source."Timestamp") ~ '^\d{1,2}/\d{1,2}/\d{4}'
            then to_timestamp(
              split_part(trim(source."Timestamp"), ' ', 1)
              || ' '
              || coalesce(
                nullif(split_part(trim(source."Timestamp"), ' ', 2), ''),
                '00:00:00'
              ),
              'DD/MM/YYYY HH24:MI:SS'
            )
          else nullif(trim(source."Timestamp"), '')::timestamptz
        end as submitted_at
      from public.gform_import_raw as source
      where source.imported_at is null
    ),
    ranked as (
      select
        normalized.*,
        row_number() over (
          partition by lower(trim(email)), kategori
          order by submitted_at desc nulls last, id desc
        ) as submission_rank
      from normalized
    )
    select *
    from ranked
    where submission_rank = 1
    order by submitted_at desc nulls last, id desc
  loop
    submitted_at := submission.submitted_at;

    select
      participant.id,
      case
        when trim(source."Timestamp") ~ '^\d{1,2}/\d{1,2}/\d{4}'
          then to_timestamp(
            split_part(trim(source."Timestamp"), ' ', 1)
            || ' '
            || coalesce(
              nullif(split_part(trim(source."Timestamp"), ' ', 2), ''),
              '00:00:00'
            ),
            'DD/MM/YYYY HH24:MI:SS'
          )
        else nullif(trim(source."Timestamp"), '')::timestamptz
      end
    into existing_participant_id, existing_submitted_at
    from public.peserta as participant
    left join public.gform_import_raw as source
      on source.id = participant.source_row_id
    where lower(trim(participant.email)) = lower(trim(submission.email))
      and participant.kategori = submission.kategori;

    if not found then
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
      values (
        submission.id,
        trim(submission.nama),
        trim(submission.asal),
        trim(submission.email),
        trim(submission.whatsapp),
        submission.kategori,
        coalesce(submitted_at::date, current_date),
        nullif(trim(submission.url_kartu), '')
      )
      returning id into existing_participant_id;

      insert into public.karya (peserta_id, url_karya, url_pernyataan)
      values (
        existing_participant_id,
        nullif(trim(submission.url_karya), ''),
        nullif(trim(submission.url_pernyataan), '')
      );
      processed_count := processed_count + 1;
    elsif submitted_at > existing_submitted_at
      or existing_submitted_at is null
    then
      update public.peserta
      set source_row_id = submission.id,
          nama = trim(submission.nama),
          asal = trim(submission.asal),
          email = trim(submission.email),
          whatsapp = trim(submission.whatsapp),
          tanggal_daftar = coalesce(submitted_at::date, current_date),
          url_kartu = nullif(trim(submission.url_kartu), '')
      where id = existing_participant_id;

      update public.karya
      set url_karya = nullif(trim(submission.url_karya), ''),
          url_pernyataan = nullif(trim(submission.url_pernyataan), '')
      where peserta_id = existing_participant_id;
      processed_count := processed_count + 1;
    end if;
  end loop;

  update public.gform_import_raw
  set imported_at = now()
  where imported_at is null;

  return processed_count;
end;
$$;
