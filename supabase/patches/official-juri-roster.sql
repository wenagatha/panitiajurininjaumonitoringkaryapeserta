create or replace function public.get_official_juri_profiles(p_kategori text)
returns table (
  id uuid,
  nama text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or p_kategori is null
    or p_kategori not in ('cerita', 'komik')
    or not exists (
      select 1
      from public.profiles as current_profile
      where current_profile.id = auth.uid()
        and (
          current_profile.role = 'panitia'
          or (
            current_profile.role = 'juri'
            and current_profile.kategori = p_kategori
          )
        )
    ) then
    raise exception 'Akses daftar juri resmi tidak diizinkan.';
  end if;

  return query
    select profile.id, profile.nama
    from public.profiles as profile
    join auth.users as account on account.id = profile.id
    where profile.role = 'juri'
      and profile.kategori = p_kategori
      and lower(coalesce(account.email, '')) = any (
        case p_kategori
          when 'cerita' then array[
            'juri1cerita@monpen.co.id',
            'juri2cerita@monpen.co.id'
          ]
          else array[
            'juri1komik@monpen.co.id',
            'juri2komik@monpen.co.id'
          ]
        end
      )
    order by account.email;
end;
$$;

revoke all on function public.get_official_juri_profiles(text)
  from public, anon;
grant execute on function public.get_official_juri_profiles(text)
  to authenticated;
