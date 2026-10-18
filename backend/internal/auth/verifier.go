package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// User は検証済みのアクセストークンから取り出したユーザー
type User struct {
	ID    uuid.UUID
	Email string
}

type claims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}

// Verifier は Supabase Auth が発行したアクセストークンを検証する
type Verifier struct {
	keyfunc keyfunc.Keyfunc
	parser  *jwt.Parser
}

// NewVerifier は Supabase Auth の JWKS を取得し、ctx が終わるまで定期的に取得し直す
func NewVerifier(ctx context.Context, supabaseURL string) (*Verifier, error) {
	issuer := strings.TrimSuffix(supabaseURL, "/") + "/auth/v1"
	jwksURL := issuer + "/.well-known/jwks.json"

	noErrorReturnFirstHTTPReq := false
	k, err := keyfunc.NewDefaultOverrideCtx(ctx, []string{jwksURL}, keyfunc.Override{
		// Supabase 側のキャッシュ (エッジとクライアントで 10 分ずつ) より長く失効した鍵を使い続けないようにする
		RefreshInterval: 10 * time.Minute,
		// 接続先の誤りに起動時に気付けるようにする
		NoErrorReturnFirstHTTPReq: &noErrorReturnFirstHTTPReq,
	})
	if err != nil {
		return nil, fmt.Errorf("fetch JWKS from %s: %w", jwksURL, err)
	}

	// 共有シークレット (HS256) で署名しているプロジェクトでは JWKS が空になる
	keys, err := k.Storage().KeyReadAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("read JWKS: %w", err)
	}
	if len(keys) == 0 {
		return nil, fmt.Errorf("JWKS at %s has no keys: enable asymmetric JWT signing keys in Supabase", jwksURL)
	}

	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{"ES256", "RS256"}),
		jwt.WithIssuer(issuer),
		// ログイン済みユーザーのトークンだけを受け付ける
		jwt.WithAudience("authenticated"),
		jwt.WithExpirationRequired(),
	)

	return &Verifier{keyfunc: k, parser: parser}, nil
}

// Verify はアクセストークンの署名と iss / aud / exp を検証し、ユーザーを返す
func (v *Verifier) Verify(token string) (User, error) {
	var c claims
	if _, err := v.parser.ParseWithClaims(token, &c, v.keyfunc.Keyfunc); err != nil {
		return User{}, fmt.Errorf("verify token: %w", err)
	}

	id, err := uuid.Parse(c.Subject)
	if err != nil {
		return User{}, errors.New("verify token: sub is not a UUID")
	}

	return User{ID: id, Email: c.Email}, nil
}
