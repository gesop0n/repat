# ADR 0003: pgx と sqlc で DB を読み書きし、goose でマイグレーションする

## Status

Accepted

## Context

DB には Supabase の Postgres を使う。
Go の API から DB を読み書きする方法と、スキーマの変更を管理する方法を決める必要がある。

Supabase には、テーブルを HTTP で読み書きできる Data API (PostgREST / GraphQL) がある。
フロントには publishable key を埋め込むため、Data API が有効だと誰でもテーブルにアクセスを試せる。

開発中に本番のデータを壊さないよう、開発用の DB はローカルに立てたい。
ただし Supabase Auth のユーザーと DB のデータは対応している必要があるので、Auth もローカルに立てる。

## Decision

### ライブラリ

| 用途 | 採用 |
| --- | --- |
| ドライバと接続プール | `jackc/pgx/v5` (`pgxpool`) |
| クエリ | `sqlc` で SQL から Go のコードを生成する |
| マイグレーション | `pressly/goose` v3 |

- マイグレーションは `backend/db/migrations` に goose の形式で書き、sqlc もここをスキーマとして読む
- クエリは `backend/db/queries` に書き、生成したコードは `backend/internal/db` に置く
- sqlc と goose は `go get -tool` で `backend/go.mod` に入れ、`go tool sqlc` / `go tool goose` で実行する。Nix の devShell には入れない

### 接続先

| 環境 | 接続先 |
| --- | --- |
| ローカル | Supabase CLI が立てる Postgres (`127.0.0.1:54322`) |
| 本番 | Supabase の Session pooler (ポート 5432) |

本番で Transaction pooler (ポート 6543) は使わない。
Transaction pooler ではプリペアドステートメントとセッション単位の advisory lock が使えず、pgx の既定の動作と goose のロックに合わないため。
接続数の上限は `DATABASE_URL` に `pool_max_conns` を付けて指定する。

### Data API とテーブルの権限

- データは Go の API からだけ読み書きし、Data API は無効にする (ローカルは `supabase/config.toml` の `[api] enabled = false`、本番はダッシュボードで無効にする)
- それでも公開されたときのために、テーブルを作るマイグレーションでは必ず `enable row level security` をし、ポリシーは作らない
- Go はテーブルの所有者 (`postgres`) で接続するため、RLS の影響を受けない。行ごとの権限は Go 側で JWT の `sub` を使って確かめる

### ローカル開発

Supabase CLI (`supabase start`) で、Postgres と Supabase Auth を Docker で立てる。
Auth は本番と同じく ES256 の非対称鍵で JWT に署名し、Go は本番と同じ JWKS の方法で検証する。
鍵は `make supabase-start` のときに `supabase/signing_keys.json` が無ければ作り、git には含めない。
使わない Storage / Realtime / Edge Functions / Analytics は止めておく。

マイグレーションは `supabase/migrations` ではなく goose で管理する。
`supabase db reset` をするとアプリのテーブルが消えるので、その後に `make migrate-up` をやり直す。

### 採用しなかった案

#### ORM (GORM / ent / Bun)

SQL を書かずに済むが、どんな SQL が発行されるかがコードから読み取りにくい。
sqlc なら SQL をそのまま書きつつ、型付きの Go のコードを得られる。

#### Supabase CLI のマイグレーション (`supabase/migrations`)

`supabase db reset` や `supabase db push` と連携できる。
一方で、マイグレーションの実行が Supabase CLI に依存し、Go のサーバとは別の仕組みで管理することになる。

#### 開発用にもう 1 つ Supabase のプロジェクトを作る

Docker が不要で、本番と同じ環境で試せる。
しかしオフラインでは開発できず、無料枠のプロジェクトは使わないと一時停止される。

## Consequences

### Pros

- SQL をそのまま書けて、コードを生成するときにスキーマと突き合わせて検証できる
- 開発に必要なツールのバージョンが `go.mod` で固定される
- ローカルでも本番と同じ方法で JWT を検証するので、認証の不具合に開発中に気付ける
- Data API を無効にしているので、publishable key があってもテーブルを読み書きされない

### Cons

- goose の CLI はすべての DB のドライバを含むため、`go.mod` に使わない依存 (MySQL や SQLite など) が並ぶ。サーバのバイナリには含まれない
- ツールの依存とアプリの依存は同じモジュールで解決されるため、ツールの更新でアプリの依存のバージョンが上がることがある
- ローカル開発に Docker が必要になる
- 本番の Supabase の設定 (Data API の無効化など) はダッシュボードで行うため、ローカルの `supabase/config.toml` との違いに気付きにくい
