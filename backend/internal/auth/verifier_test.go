package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/gesop0n/repat/backend/internal/auth/authtest"
)

func TestVerifier(t *testing.T) {
	key := authtest.NewKey(t)
	srv := authtest.NewSupabase(t, key)
	issuer := srv.URL + "/auth/v1"
	userID := uuid.New()

	v, err := NewVerifier(t.Context(), srv.URL)
	if err != nil {
		t.Fatal(err)
	}

	validClaims := func() jwt.MapClaims {
		return jwt.MapClaims{
			"iss":   issuer,
			"aud":   "authenticated",
			"sub":   userID.String(),
			"email": "user@example.com",
			"exp":   time.Now().Add(time.Hour).Unix(),
		}
	}

	t.Run("valid token", func(t *testing.T) {
		got, err := v.Verify(authtest.Sign(t, key, validClaims()))
		if err != nil {
			t.Fatal(err)
		}
		if got.ID != userID || got.Email != "user@example.com" {
			t.Errorf("got %+v", got)
		}
	})

	invalid := map[string]func() string{
		"expired": func() string {
			c := validClaims()
			c["exp"] = time.Now().Add(-time.Minute).Unix()
			return authtest.Sign(t, key, c)
		},
		"no exp": func() string {
			c := validClaims()
			delete(c, "exp")
			return authtest.Sign(t, key, c)
		},
		"other issuer": func() string {
			c := validClaims()
			c["iss"] = "https://other.supabase.co/auth/v1"
			return authtest.Sign(t, key, c)
		},
		"anon audience": func() string {
			c := validClaims()
			c["aud"] = "anon"
			return authtest.Sign(t, key, c)
		},
		"sub is not a UUID": func() string {
			c := validClaims()
			c["sub"] = "not-a-uuid"
			return authtest.Sign(t, key, c)
		},
		"signed by unknown key": func() string {
			return authtest.Sign(t, authtest.NewKey(t), validClaims())
		},
		"HS256": func() string {
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, validClaims())
			token.Header["kid"] = authtest.KID
			s, err := token.SignedString([]byte("secret"))
			if err != nil {
				t.Fatal(err)
			}
			return s
		},
	}
	for name, token := range invalid {
		t.Run(name, func(t *testing.T) {
			if _, err := v.Verify(token()); err == nil {
				t.Error("want error, got nil")
			}
		})
	}
}

func TestNewVerifierRejectsEmptyJWKS(t *testing.T) {
	// 共有シークレット (HS256) のプロジェクトでは JWKS が空になる
	srv := authtest.NewSupabase(t)
	if _, err := NewVerifier(t.Context(), srv.URL); err == nil {
		t.Error("want error, got nil")
	}
}

func TestBearerToken(t *testing.T) {
	tests := []struct {
		header string
		want   string
		ok     bool
	}{
		{"Bearer abc", "abc", true},
		{"bearer abc", "abc", true},
		{"Bearer ", "", false},
		{"Basic abc", "", false},
		{"abc", "", false},
		{"", "", false},
	}
	for _, tt := range tests {
		got, ok := bearerToken(tt.header)
		if got != tt.want || ok != tt.ok {
			t.Errorf("bearerToken(%q) = %q, %v; want %q, %v", tt.header, got, ok, tt.want, tt.ok)
		}
	}
}
