-- name: CreateProfileIfNotExists :exec
insert into profiles (id)
values ($1)
on conflict (id) do nothing;

-- name: GetProfile :one
select *
from profiles
where id = $1;
