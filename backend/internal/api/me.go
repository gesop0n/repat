package api

import (
	"context"
	"fmt"

	"github.com/gesop0n/repat/backend/internal/auth"
	"github.com/gesop0n/repat/backend/internal/oapi"
)

// GetMe はログイン中のユーザーを返す
// 初回のアクセスで profiles の行を作るので、登録直後に呼べばアプリ側のユーザーができる
func (s *server) GetMe(ctx context.Context, _ oapi.GetMeRequestObject) (oapi.GetMeResponseObject, error) {
	user := auth.UserFrom(ctx)

	if err := s.queries.CreateProfileIfNotExists(ctx, user.ID); err != nil {
		return nil, fmt.Errorf("create profile: %w", err)
	}

	profile, err := s.queries.GetProfile(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("get profile: %w", err)
	}

	return oapi.GetMe200JSONResponse{
		Id:        profile.ID,
		Email:     user.Email,
		CreatedAt: profile.CreatedAt,
	}, nil
}
