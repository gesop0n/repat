# ADR 0004: OpenAPI の仕様書を先に書き、Go のサーバと TS のクライアントを生成する

## Status

Accepted

## Context

API のレスポンスの形を、Go の struct とフロントの zod のスキーマの両方に手で書いていた。
API が増えると、片方だけ変えてずれても、実際に呼ぶまで気付けない。

[ADR 0003](0003-database-access.md) では、SQL を先に書いて Go のコードを生成すると決めた。
API も同じく、仕様を先に書いて両側のコードを生成する。

## Decision

### 仕様書

- `api/openapi.yaml` に OpenAPI 3.0 で書く。oapi-codegen が使う kin-openapi が 3.1 に一部しか対応していないため
- `servers` は `/api` にし、パスは `/me` のように `/api` を除いて書く
- 既定で `security: [bearerAuth]` にし、ログインが要らない操作だけ `security: []` にする
- `make openapi` で両側のコードを生成する。生成したコードは sqlc と同じくリポジトリに含め、ビルドのときには生成しない

### サーバ (Go)

| 用途 | 採用 |
| --- | --- |
| 生成 | `oapi-codegen` (gin-server / strict-server / models / embedded-spec) |
| リクエストの検証と認証 | kin-openapi の `openapi3filter` で、埋め込んだ仕様書と照らし合わせる |

- 生成したコードは `backend/internal/oapi` に置く。oapi-codegen は `go get -tool` で `backend/go.mod` に入れる
- handler は `oapi.StrictServerInterface` を実装し、ステータスごとの型でレスポンスを返す。仕様書に無いレスポンスは返せない
- 仕様書で security が付いた操作では、アクセストークンを [ADR 0002](0002-auth.md) の方法で検証する。失敗したら 401 を返し、理由はログにだけ残す
- 検証したユーザーはリクエストの context に入れる。strict server の handler は `*gin.Context` を context として受け取るため、gin の `ContextWithFallback` を有効にする
- handler が error を返したら、内容はログにだけ残し、500 と `{"error": "internal server error"}` を返す。生成されたコードの既定ではエラーの文をそのまま返すため、差し替える

### クライアント (TS)

| 用途 | 採用 |
| --- | --- |
| 生成 | `orval` (`client: react-query`, `httpClient: fetch`) |
| データの取得とキャッシュ | TanStack Query |
| レスポンスの検証 | orval が生成する zod のスキーマ |

- 生成したコードは `frontend/src/api/generated` に置く
- 生成されたフックは `src/api/fetcher.ts` の `apiFetch` を通して API を呼ぶ。`apiFetch` がアクセストークンを付け、レスポンスを zod で検証する
- ログアウトしたら TanStack Query のキャッシュを消し、前のユーザーのデータを次のユーザーに見せない

### 採用しなかった案

#### Go のコードから仕様書を生成する (Huma)

Go の入出力の型から仕様書を作るため、コードと仕様書がずれない。
一方で handler を Huma の形で書くことになり、エラーのレスポンスも RFC 9457 の形に変わる。
仕様書は生成物になるため、API の変更を仕様書の差分として先に確かめることはできない。

#### Go のコメントから仕様書を生成する (swaggo/swag)

gin の handler をそのまま使える。
しかしステータスや型をコメントに書くため、コードとずれても気付けない。

#### oapi-codegen の gin-middleware でリクエストを検証する

`oapi-codegen/gin-middleware` は、認証の失敗もほかの検証の失敗と同じく 400 で返す。
401 と区別するにはエラーの文を見るしかないため、`openapi3filter` を直接呼ぶミドルウェアを書いた。

#### orval の fetch の関数だけを生成する (TanStack Query を使わない)

依存は増えない。
しかし取得中・失敗・キャッシュの状態を、画面ごとに `useEffect` で扱う必要がある。

## Consequences

### Pros

- API の型が仕様書の 1 か所で決まり、Go と TS で食い違うとコンパイルの時点で気付ける
- handler に届く前に、リクエストが仕様書の形になっていることを確かめられる
- 操作にログインが必要かどうかを仕様書から読める。新しい操作は既定でログインが必須になる

### Cons

- 仕様書を変えたら `make openapi` を実行する必要がある。生成し忘れを CI で確かめる仕組みはまだ無い
- 3.0 で書くため、3.1 の書き方 (`type` を配列にして null を表すなど) は使えない
- orval (8.43) は zod のスキーマを出力するとき `components/responses` の型を生成しない。そのため、エラーのレスポンスは `components/responses` にまとめず、操作ごとに書く
- 生成したコードは量が多く、差分が大きくなる。lint とフォーマットの対象からは外している
- TanStack Query と zod のスキーマがバンドルに入り、フロントの JS が大きくなる
