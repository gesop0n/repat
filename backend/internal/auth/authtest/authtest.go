// Package authtest は、Supabase Auth の代わりに JWKS を返すサーバとアクセストークンをテスト用に作る
package authtest

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/golang-jwt/jwt/v5"
)

// KID は JWKS に載せる鍵とトークンのヘッダに入れる kid
const KID = "test-key"

// NewSupabase は JWKS だけを返す Supabase Auth の代わりを立てる
// 発行元 (iss) は URL + "/auth/v1" になる
func NewSupabase(t *testing.T, keys ...*ecdsa.PrivateKey) *httptest.Server {
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
			"kid": KID,
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

// NewKey は ES256 の署名鍵を作る
func NewKey(t *testing.T) *ecdsa.PrivateKey {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	return key
}

// Sign は c を key で署名したトークンを返す
func Sign(t *testing.T, key *ecdsa.PrivateKey, c jwt.MapClaims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodES256, c)
	token.Header["kid"] = KID
	s, err := token.SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return s
}
