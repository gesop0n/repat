package api

import (
	"fmt"
	"io/fs"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/gesop0n/repat/backend/internal/auth"
	"github.com/gesop0n/repat/backend/internal/db"
)

func NewRouter(
	frontend fs.FS,
	trustedProxies []string,
	queries *db.Queries,
	verifier *auth.Verifier,
) (*gin.Engine, error) {
	r := gin.Default()

	// nil なら X-Forwarded-For を信用せず、接続元アドレスを ClientIP とする
	if err := r.SetTrustedProxies(trustedProxies); err != nil {
		return nil, fmt.Errorf("set trusted proxies: %w", err)
	}

	api := r.Group("/api")
	{
		api.GET("/health", func(ctx *gin.Context) {
			ctx.JSON(http.StatusOK, gin.H{
				"status": "ok",
			})
		})

		authed := api.Group("", auth.Middleware(verifier))
		authed.GET("/me", getMe(queries))
	}

	if frontend != nil {
		RegisterStatic(r, frontend)
	}

	return r, nil
}
