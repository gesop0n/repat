package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers/gorillamux"
	"github.com/gin-gonic/gin"

	"github.com/gesop0n/repat/backend/internal/auth"
	"github.com/gesop0n/repat/backend/internal/oapi"
)

// bearerScheme は api/openapi.yaml の securitySchemes での名前
const bearerScheme = "bearerAuth"

// validateRequest は仕様書に沿ってリクエストを検証する
// security が付いた操作ではアクセストークンを検証し、ユーザーを context に入れる
func validateRequest(spec *openapi3.T, verifier *auth.Verifier) (gin.HandlerFunc, error) {
	router, err := gorillamux.NewRouter(spec)
	if err != nil {
		return nil, fmt.Errorf("create OpenAPI router: %w", err)
	}

	return func(c *gin.Context) {
		route, pathParams, err := router.FindRoute(c.Request)
		if err != nil {
			// gin にルートがあるのに仕様書に無い。コードの生成し忘れなどで起きる
			_ = c.Error(err)
			c.AbortWithStatusJSON(http.StatusNotFound, oapi.ErrorResponse{Error: "not found"})
			return
		}

		// 検証中に c.Request を差し替えると、検証で読み直したボディが handler に届かなくなる
		// ユーザーは検証が終わってから context に入れる
		var user *auth.User
		input := &openapi3filter.RequestValidationInput{
			Request:    c.Request,
			PathParams: pathParams,
			Route:      route,
			Options: &openapi3filter.Options{
				AuthenticationFunc: func(_ context.Context, in *openapi3filter.AuthenticationInput) error {
					if in.SecuritySchemeName != bearerScheme {
						return fmt.Errorf("unsupported security scheme %q", in.SecuritySchemeName)
					}
					u, err := verifier.VerifyHeader(c.GetHeader("Authorization"))
					if err != nil {
						return err
					}
					user = &u
					return nil
				},
			},
		}

		if err := openapi3filter.ValidateRequest(c.Request.Context(), input); err != nil {
			if _, ok := errors.AsType[*openapi3filter.SecurityRequirementsError](err); ok {
				abortUnauthorized(c, err)
				return
			}
			_ = c.Error(err)
			c.AbortWithStatusJSON(http.StatusBadRequest, oapi.ErrorResponse{Error: err.Error()})
			return
		}

		if user != nil {
			c.Request = c.Request.WithContext(auth.WithUser(c.Request.Context(), *user))
		}
		c.Next()
	}, nil
}

func abortUnauthorized(c *gin.Context, err error) {
	// 理由はログにだけ残し、レスポンスには含めない
	_ = c.Error(err)
	c.Header("WWW-Authenticate", "Bearer")
	c.AbortWithStatusJSON(http.StatusUnauthorized, oapi.ErrorResponse{Error: "unauthorized"})
}

func abortInternal(c *gin.Context, err error) {
	_ = c.Error(err)
	c.AbortWithStatusJSON(http.StatusInternalServerError, oapi.ErrorResponse{Error: "internal server error"})
}
