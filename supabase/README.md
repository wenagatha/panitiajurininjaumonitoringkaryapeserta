# Menyiapkan Supabase

## 1. Buat tabel dan kebijakan akses

Di Supabase Dashboard, buka **SQL Editor**, pilih **New query**, lalu jalankan
isi file `migrations/20261111000000_initial_schema.sql`.

Skrip membuat tabel profil, peserta, karya, peninjauan dan peringkat juri,
aturan Row Level Security (RLS), serta tabel penampung CSV Google Form.
Jalankan sekali pada proyek yang masih kosong.

## 2. Impor CSV Google Form

1. Pastikan ekspor CSV memiliki kolom yang sama dengan header di
   `gform_import_raw` (termasuk tanda baca dan huruf besar-kecil).
2. Di **Table Editor**, buka `gform_import_raw`, lalu impor CSV. Kolom `id` dan
   `imported_at` dibuat oleh database; keduanya tidak perlu ada di CSV.
3. Buka **SQL Editor** dan jalankan:

   ```sql
   select public.import_google_form_csv();
   ```

   Hasilnya adalah jumlah baris baru yang dipindahkan ke tabel `peserta` dan
   `karya`. Baris dengan kategori selain cerita/komik, atau data wajib yang
   kosong, membuat impor gagal dengan pesan yang menjelaskan masalahnya.
   `Email` dari jawaban formulir dipakai lebih dulu; `Email address` otomatis
   dari Google Form menjadi cadangan.
4. Periksa data di kedua tabel sebelum menghapus CSV dari tabel penampung.
   Fungsi impor aman dijalankan ulang: baris yang sudah dipindahkan tidak
   dimasukkan ulang.

Jika CSV berisi pengiriman ulang dengan email dan kategori sama, tinjau
kelompok duplikat terlebih dahulu dan jalankan patch pemilihan timestamp terbaru
di bagian berikut sebelum menjalankan fungsi impor.

Jika skema sudah dibuat sebelum 11 November 2026 pukul 02:40 WIB, jalankan
`patches/fix-google-form-timestamp.sql` di SQL Editor terlebih dahulu. Patch
ini memastikan timestamp ekspor berformat `DD/MM/YYYY HH:mm:ss` dibaca sebagai
tanggal Indonesia, bukan format bulan/hari.

## Riwayat perubahan status panitia

Untuk memakai halaman daftar/detail karya panitia dengan data Supabase dan
mencatat setiap perubahan status secara bersama:

1. Pastikan skema awal sudah dibuat dan data peserta/karya sudah diimpor.
2. Di **SQL Editor**, jalankan isi `patches/panitia-status-audit.sql` satu kali.
   Patch menambahkan `riwayat_panitia` dan fungsi atomik yang memperbarui status
   sekaligus mencatat status lama/baru, akun panitia, dan waktu. Pembaruan status
   langsung ke tabel `karya` oleh akun aplikasi dicabut agar perubahan tidak
   melewati riwayat.
3. Setelah patch berhasil, buka ulang halaman **Karya** atau **Karya Komik**
   sebagai panitia. Perubahan status akan terlihat di seluruh akun panitia dan
   riwayat lengkapnya muncul pada detail karya.

Jika patch SQL belum dijalankan, halaman tersebut belum dapat memuat riwayat
atau menyimpan keputusan.

## Alasan penolakan karya

Setelah `patches/panitia-status-audit.sql` diterapkan, jalankan isi
`patches/rejection-reasons.sql` di SQL Editor. Patch menambah kolom alasan pada
karya dan riwayat status, mewajibkan alasan (maksimal 1000 karakter) saat
panitia menolak karya, serta memberi panitia dan juri akses baca ke riwayat
status. Daftar karya juri menampilkan karya yang ditolak beserta alasan, tetapi
karya tersebut tidak dapat ditinjau sebagai karya terverifikasi.

Setiap penolakan baru menyimpan alasan dalam riwayat. Pastikan proyek Supabase
yang dipilih benar sebelum menjalankan patch.

## Alur peninjauan dan penetapan juri

Halaman juri, kandidat, dan papan peringkat membaca data bersama dari Supabase.
Sebelum juri mulai menggunakannya:

1. Pastikan skema awal sudah dibuat dan akun juri sudah memiliki `role = 'juri'`
   serta kategori `cerita` atau `komik` pada tabel `profiles`.
2. Di **SQL Editor**, jalankan isi `patches/juri-shared-workflow.sql` satu kali.
   Patch menambahkan fungsi aksi untuk mulai/menyelesaikan tinjauan, menandai
   tinjauan selesai, memilih atau membatalkan kandidat, serta menetapkan,
   mengganti, dan mengosongkan peringkat. Fungsi memeriksa identitas akun,
   kategori, status karya, kuota, dan kelayakan aksi; perubahan kandidat dan
   peringkat dicatat di `riwayat_juri`.
3. Pastikan karya yang ingin dinilai berstatus `diverifikasi`. Karya yang belum
   diverifikasi tidak ditampilkan kepada juri.

Pilihan kandidat setiap juri tetap terpisah. Peringkat merupakan keputusan
bersama per karya dan kategori: salah satu juri dapat menyimpan keputusan final
setelah berunding. Pembatalan pilihan kandidat terakhir juga meminta
konfirmasi sebelum menghapus peringkat yang sudah ditetapkan. Jika patch belum
dijalankan, aksi juri akan gagal dengan pesan dari Supabase.

## Kiriman ulang dengan email dan kategori yang sama

Kiriman yang memakai email dan kategori lomba yang sama dianggap sebagai
pengiriman ulang. Versi dengan timestamp terbaru yang dipakai. Sebelum
menghapus kiriman lama:

1. Jalankan isi `patches/preview-google-form-duplicates.sql` di SQL Editor.
   Query hanya menampilkan kelompok duplikat, email yang disamarkan, kategori,
   jumlah kiriman, dan rentang timestamp. Query ini tidak mengubah data.
2. Tinjau hasilnya dan pastikan email+kategori memang cara yang tepat
   mengenali kiriman ulang. Periksa aktivitas juri untuk kiriman lama.
3. Jika duplikat sudah dikonfirmasi dan tidak memiliki aktivitas juri,
   jalankan isi `patches/remove-old-google-form-duplicates.sql`. Skrip
   menghapus peserta lama dan karya terkait, tetapi membiarkan semua baris CSV
   di `gform_import_raw` tetap tersimpan. Skrip membatalkan penghapusan jika
   mendeteksi aktivitas juri.
4. Untuk impor CSV berikutnya, jalankan isi
   `patches/latest-google-form-resubmission.sql` sekali. Fungsi impor yang
   diperbarui akan memilih kiriman terbaru untuk email+kategori yang sama dan
   memperbarui peserta/karya yang sudah ada, alih-alih membuat duplikat.

Sebelum menjalankan skrip penghapusan, pastikan kembali bahwa proyek Supabase
yang dipilih benar. Penghapusan peserta juga menghapus karya terkait melalui
relasi database; baris CSV mentah tetap tersedia untuk audit.

Tautan kartu, karya, dan pernyataan tetap berupa tautan Google Drive. Pastikan
akun panitia/juri punya izin membuka berkas tersebut; impor CSV tidak menyalin
berkas ke Supabase Storage.

## 3. Buat akun panitia dan juri

Sebelum membuat akun, jalankan isi `patches/first-login-account-setup.sql`
di SQL Editor. Patch menambah penanda setup awal akun untuk skema yang sudah
ada. Buat 13 akun berikut melalui **Authentication → Users → Add user**:

```text
panitia1@monpen.co.id
panitia2@monpen.co.id
panitia3@monpen.co.id
panitia4@monpen.co.id
panitia5@monpen.co.id
panitia6@monpen.co.id
panitia7@monpen.co.id
panitia8@monpen.co.id
panitia9@monpen.co.id
juri1cerita@monpen.co.id
juri2cerita@monpen.co.id
juri1komik@monpen.co.id
juri2komik@monpen.co.id
```

Gunakan kata sandi awal yang berbeda dan acak untuk setiap akun. Setelah semua
akun dibuat, jalankan query berikut. Query berhenti tanpa mengubah sebagian
data jika salah satu dari 13 akun belum ditemukan.

```sql
do $$
declare
  updated_count integer;
begin
  update public.profiles as profile
  set role = account.role,
      kategori = account.kategori
  from auth.users as auth_user
  join (
    values
      ('panitia1@monpen.co.id', 'panitia', null::text),
      ('panitia2@monpen.co.id', 'panitia', null::text),
      ('panitia3@monpen.co.id', 'panitia', null::text),
      ('panitia4@monpen.co.id', 'panitia', null::text),
      ('panitia5@monpen.co.id', 'panitia', null::text),
      ('panitia6@monpen.co.id', 'panitia', null::text),
      ('panitia7@monpen.co.id', 'panitia', null::text),
      ('panitia8@monpen.co.id', 'panitia', null::text),
      ('panitia9@monpen.co.id', 'panitia', null::text),
      ('juri1cerita@monpen.co.id', 'juri', 'cerita'),
      ('juri2cerita@monpen.co.id', 'juri', 'cerita'),
      ('juri1komik@monpen.co.id', 'juri', 'komik'),
      ('juri2komik@monpen.co.id', 'juri', 'komik')
  ) as account(email, role, kategori)
    on lower(auth_user.email) = account.email
  where profile.id = auth_user.id;

  get diagnostics updated_count = row_count;
  if updated_count <> 13 then
    raise exception 'Ditemukan % dari 13 akun. Pastikan semua akun sudah dibuat dengan alamat email yang tepat.', updated_count;
  end if;
end;
$$;
```

Berikan kata sandi awal kepada tiap pemilik akun melalui kanal pribadi yang
aman. Saat login pertama kali, aplikasi mewajibkan mereka mengisi nama dan
membuat kata sandi pribadi minimal 8 karakter. Nama disimpan di profil serta
ditampilkan di sidebar. Supabase Auth menyediakan ID akun yang unik untuk
mengaitkan aksi juri di `riwayat_juri` dengan akun masing-masing.

Jangan menambahkan key rahasia Supabase ke variabel `NEXT_PUBLIC_*`.

## Catatan integrasi aplikasi

`.env.local` menyimpan URL proyek dan publishable key. Tabel dan RLS di atas
menyiapkan skema. Login/logout Supabase Auth dan pemeriksaan peran pada halaman
panitia/juri sudah aktif. Setup awal akun mewajibkan nama dan penggantian
password. Halaman daftar peserta dan daftar/detail karya panitia membaca tabel
Supabase. Status karya dan riwayat status pada karya panitia memerlukan patch
riwayat status di atas; halaman penilaian juri memerlukan patch alur juri.
Impor CSV dilakukan melalui dashboard Supabase dan belum otomatis dijalankan
dari aplikasi.
