alter table public.profiles
  add column if not exists must_change_password boolean not null default true;

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

revoke all on function public.complete_staff_onboarding(text) from public, anon;
grant execute on function public.complete_staff_onboarding(text) to authenticated;
