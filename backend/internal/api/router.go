package api

import (
	"fmt"
	"io/fs"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/gesop0n/repat/backend/internal/auth"
	"github.com/gesop0n/repat/backend/internal/db"
	"github.com/gesop0n/repat/backend/internal/oapi"
)

func NewRouter(
	frontend fs.FS,
	trustedProxies []string,
	queries *db.Queries,
	verifier *auth.Verifier,
) (*gin.Engine, error) {
	r := gin.Default()

	// strict server の handler は *gin.Context を context.Context として受け取る
	// その Done や Value がリクエストの context を見るようにし、DB の問い合わせのキャンセルや auth.UserFrom を効かせる
	r.ContextWithFallback = true

	// nil なら X-Forwarded-For を信用せず、接続元アドレスを ClientIP とする
	if err := r.SetTrustedProxies(trustedProxies); err != nil {
		return nil, fmt.Errorf("set trusted proxies: %w", err)
	}

	spec, err := oapi.GetSpec()
	if err != nil {
		return nil, fmt.Errorf("load OpenAPI spec: %w", err)
	}
	validate, err := validateRequest(spec, verifier)
	if err != nil {
		return nil, err
	}

	handler := oapi.NewStrictHandlerWithOptions(&server{queries: queries}, nil, oapi.StrictGinServerOptions{
		RequestErrorHandlerFunc: func(c *gin.Context, err error) {
			_ = c.Error(err)
			c.AbortWithStatusJSON(http.StatusBadRequest, oapi.ErrorResponse{Error: err.Error()})
		},
		HandlerErrorFunc:         abortInternal,
		ResponseErrorHandlerFunc: abortInternal,
	})

	// 仕様書の servers に合わせて /api の下に登録する
	oapi.RegisterHandlersWithOptions(r.Group("/api", validate), handler, oapi.GinServerOptions{
		ErrorHandler: func(c *gin.Context, err error, statusCode int) {
			_ = c.Error(err)
			c.AbortWithStatusJSON(statusCode, oapi.ErrorResponse{Error: err.Error()})
		},
	})

	if frontend != nil {
		RegisterStatic(r, frontend)
	}

	return r, nil
}
