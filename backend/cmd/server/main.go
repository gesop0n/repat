package main

import (
	"context"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"

	"github.com/gesop0n/repat/backend/internal/api"
	"github.com/gesop0n/repat/backend/internal/auth"
	"github.com/gesop0n/repat/backend/internal/config"
	"github.com/gesop0n/repat/backend/internal/db"
	"github.com/gesop0n/repat/backend/internal/web"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	// frontend 未ビルドでも API の開発はできるようにする
	frontendFS, err := web.FS()
	if err != nil {
		log.Printf("frontend is not embedded, serving API only: %v", err)
	}

	// ルート登録時のデバッグ出力も切り替わるよう、router を作る前に設定する
	if cfg.Env == config.EnvProduction {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	ctx := context.Background()

	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect database: %v", err)
	}
	defer pool.Close()

	verifier, err := auth.NewVerifier(ctx, cfg.SupabaseURL)
	if err != nil {
		log.Fatalf("create token verifier: %v", err)
	}

	router, err := api.NewRouter(frontendFS, cfg.TrustedProxies, db.New(pool), verifier)
	if err != nil {
		log.Fatalf("create router: %v", err)
	}

	if err := router.Run(fmt.Sprintf(":%d", cfg.Port)); err != nil {
		log.Fatalf("start HTTP server: %v", err)
	}
}
