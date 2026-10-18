package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/gesop0n/repat/backend/internal/auth"
	"github.com/gesop0n/repat/backend/internal/db"
)

type meResponse struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

// getMe はログイン中のユーザーを返す
// 初回のアクセスで profiles の行を作るので、登録直後に呼べばアプリ側のユーザーができる
func getMe(queries *db.Queries) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := auth.UserFrom(c)
		ctx := c.Request.Context()

		if err := queries.CreateProfileIfNotExists(ctx, user.ID); err != nil {
			abortInternal(c, err)
			return
		}

		profile, err := queries.GetProfile(ctx, user.ID)
		if err != nil {
			abortInternal(c, err)
			return
		}

		c.JSON(http.StatusOK, meResponse{
			ID:        profile.ID,
			Email:     user.Email,
			CreatedAt: profile.CreatedAt,
		})
	}
}

func abortInternal(c *gin.Context, err error) {
	_ = c.Error(err)
	c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
		"error": "internal server error",
	})
}
