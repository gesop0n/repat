package auth

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const testKID = "test-key"

// newTestSupabase は JWKS だけを返す Supabase Auth の代わりを立てる
func newTestSupabase(t *testing.T, keys ...*ecdsa.PrivateKey) *httptest.Server {
	t.Helper()

	jwks := map[string][]map[string]string{"keys": {}}
	for _, key := range keys {
		// 非圧縮形式 (0x04 || X || Y) から座標を取り出す
		point, err := key.PublicKey.Bytes()
		if err != nil {
			t.Fatal(err)
		}
		jwks["keys"] = append(jwks["keys"], map[string]string{
			"kty": "EC",
			"crv": "P-256",
			"alg": "ES256",
			"use": "sig",
			"kid": testKID,
			"x":   base64.RawURLEncoding.EncodeToString(point[1:33]),
			"y":   base64.RawURLEncoding.EncodeToString(point[33:]),
		})
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/auth/v1/.well-known/jwks.json" {
			http.NotFound(w, r)
			return
		}
		_ = json.NewEncoder(w).Encode(jwks)
	}))
	t.Cleanup(srv.Close)
	return srv
}

func newKey(t *testing.T) *ecdsa.PrivateKey {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	return key
}

func sign(t *testing.T, key *ecdsa.PrivateKey, c jwt.MapClaims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodES256, c)
	token.Header["kid"] = testKID
	s, err := token.SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestVerifier(t *testing.T) {
	key := newKey(t)
	srv := newTestSupabase(t, key)
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
		got, err := v.Verify(sign(t, key, validClaims()))
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
			return sign(t, key, c)
		},
		"no exp": func() string {
			c := validClaims()
			delete(c, "exp")
			return sign(t, key, c)
		},
		"other issuer": func() string {
			c := validClaims()
			c["iss"] = "https://other.supabase.co/auth/v1"
			return sign(t, key, c)
		},
		"anon audience": func() string {
			c := validClaims()
			c["aud"] = "anon"
			return sign(t, key, c)
		},
		"sub is not a UUID": func() string {
			c := validClaims()
			c["sub"] = "not-a-uuid"
			return sign(t, key, c)
		},
		"signed by unknown key": func() string {
			return sign(t, newKey(t), validClaims())
		},
		"HS256": func() string {
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, validClaims())
			token.Header["kid"] = testKID
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
	srv := newTestSupabase(t)
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
