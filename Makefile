BACKEND_DIR  := backend
FRONTEND_DIR := frontend
EMBED_DIR    := $(BACKEND_DIR)/internal/web/dist
BIN_DIR      := bin
SIGNING_KEYS := supabase/signing_keys.json

# goose は DATABASE_URL のデータベースにマイグレーションを適用する
GOOSE := cd $(BACKEND_DIR) && GOOSE_DRIVER=postgres GOOSE_DBSTRING="$$DATABASE_URL" \
	GOOSE_MIGRATION_DIR=db/migrations go tool goose

.PHONY: build build-frontend build-backend embed-frontend \
	dev-backend dev-frontend test lint clean \
	supabase-start supabase-stop sqlc \
	migrate-up migrate-down migrate-status migrate-new

## build: frontend をビルドして backend のバイナリに埋め込む
## make -j でも順序が崩れないよう、サブ make で順番に実行する
build:
	$(MAKE) build-frontend
	$(MAKE) embed-frontend
	$(MAKE) build-backend

build-frontend:
	pnpm -C $(FRONTEND_DIR) install --frozen-lockfile
	pnpm -C $(FRONTEND_DIR) build

## embed-frontend: frontend/dist を backend の embed ディレクトリへコピーする
embed-frontend:
	find $(EMBED_DIR) -mindepth 1 ! -name .gitkeep -exec rm -rf {} +
	cp -R $(FRONTEND_DIR)/dist/. $(EMBED_DIR)/

build-backend:
	cd $(BACKEND_DIR) && go build -o ../$(BIN_DIR)/server ./cmd/server

## dev-backend: API サーバを起動する (:8080, REPAT_SERVER_PORT で変更可)
dev-backend:
	cd $(BACKEND_DIR) && go run ./cmd/server

## dev-frontend: Vite の開発サーバを起動する (/api は REPAT_SERVER_PORT のバックエンドへ転送)
dev-frontend:
	pnpm -C $(FRONTEND_DIR) dev

## supabase-start: ローカルの Supabase (Postgres / Auth) を Docker で起動する
supabase-start: $(SIGNING_KEYS)
	supabase start

supabase-stop:
	supabase stop

## ローカルの Auth が JWT の署名に使う ES256 の鍵を作る (既にあれば作らない)
$(SIGNING_KEYS):
	echo '[]' > $@
	supabase gen signing-key --algorithm ES256 --yes

## sqlc: backend/db/queries の SQL から Go のコードを生成する
sqlc:
	cd $(BACKEND_DIR) && go tool sqlc generate

migrate-up:
	$(GOOSE) up

migrate-down:
	$(GOOSE) down

migrate-status:
	$(GOOSE) status

## migrate-new: マイグレーションを作る (例: make migrate-new name=create_reviews)
migrate-new:
	$(GOOSE) -s create $(name) sql

test:
	cd $(BACKEND_DIR) && go test ./...

lint:
	cd $(BACKEND_DIR) && go vet ./...
	pnpm -C $(FRONTEND_DIR) lint

clean:
	rm -rf $(BIN_DIR) $(FRONTEND_DIR)/dist
	find $(EMBED_DIR) -mindepth 1 ! -name .gitkeep -exec rm -rf {} +
