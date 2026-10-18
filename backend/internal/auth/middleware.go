package auth

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const userKey = "auth.user"

// Middleware は Authorization: Bearer のアクセストークンを検証し、ユーザーを context に入れる
func Middleware(v *Verifier) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, ok := bearerToken(c.GetHeader("Authorization"))
		if !ok {
			abortUnauthorized(c, errors.New("missing bearer token"))
			return
		}

		user, err := v.Verify(token)
		if err != nil {
			abortUnauthorized(c, err)
			return
		}

		c.Set(userKey, user)
		c.Next()
	}
}

// UserFrom は Middleware が context に入れたユーザーを返す
// Middleware を通らないルートで呼ぶと panic する
func UserFrom(c *gin.Context) User {
	return c.MustGet(userKey).(User)
}

func bearerToken(header string) (string, bool) {
	scheme, token, ok := strings.Cut(header, " ")
	if !ok || !strings.EqualFold(scheme, "Bearer") || token == "" {
		return "", false
	}
	return token, true
}

func abortUnauthorized(c *gin.Context, err error) {
	// 理由はログにだけ残し、レスポンスには含めない
	_ = c.Error(err)
	c.Header("WWW-Authenticate", "Bearer")
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
		"error": "unauthorized",
	})
}
