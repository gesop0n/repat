package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"

	"github.com/gesop0n/repat/backend/internal/api"
	"github.com/gesop0n/repat/backend/internal/config"
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

	router, err := api.NewRouter(frontendFS, cfg.TrustedProxies)
	if err != nil {
		log.Fatalf("create router: %v", err)
	}

	if err := router.Run(fmt.Sprintf(":%d", cfg.Port)); err != nil {
		log.Fatalf("start HTTP server: %v", err)
	}
}
