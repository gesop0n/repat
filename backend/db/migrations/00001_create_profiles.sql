-- +goose Up
-- ログイン情報は Supabase Auth の auth.users が持ち、アプリ側のユーザー情報はここに持つ
create table profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);

-- Data API (anon / authenticated ロール) からは読み書きさせない
-- テーブル所有者の postgres で接続する Go の API は RLS の対象外になる
alter table profiles enable row level security;

-- +goose Down
drop table profiles;
