package auth

import (
	"context"
	"errors"
	"strings"
)

type userKey struct{}

// WithUser は検証済みのユーザーを ctx に入れる
func WithUser(ctx context.Context, user User) context.Context {
	return context.WithValue(ctx, userKey{}, user)
}

// UserFrom は WithUser で入れたユーザーを返す
// 仕様書で `security: []` にした操作など、認証を通らない操作で呼ぶと panic する
func UserFrom(ctx context.Context) User {
	return ctx.Value(userKey{}).(User)
}

// VerifyHeader は Authorization ヘッダの Bearer トークンを検証し、ユーザーを返す
func (v *Verifier) VerifyHeader(header string) (User, error) {
	token, ok := bearerToken(header)
	if !ok {
		return User{}, errors.New("missing bearer token")
	}
	return v.Verify(token)
}

func bearerToken(header string) (string, bool) {
	scheme, token, ok := strings.Cut(header, " ")
	if !ok || !strings.EqualFold(scheme, "Bearer") || token == "" {
		return "", false
	}
	return token, true
}
