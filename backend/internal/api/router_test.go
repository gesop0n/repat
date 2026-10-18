package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/gesop0n/repat/backend/internal/auth"
	"github.com/gesop0n/repat/backend/internal/auth/authtest"
	"github.com/gesop0n/repat/backend/internal/db"
)

// fakeDB は profiles の作成を無視し、取得では渡された ID と createdAt の行を返す
type fakeDB struct {
	createdAt time.Time
}

func (fakeDB) Exec(context.Context, string, ...any) (pgconn.CommandTag, error) {
	return pgconn.CommandTag{}, nil
}

func (fakeDB) Query(context.Context, string, ...any) (pgx.Rows, error) {
	return nil, errors.New("not implemented")
}

func (f fakeDB) QueryRow(_ context.Context, _ string, args ...any) pgx.Row {
	return fakeRow{id: args[0].(uuid.UUID), createdAt: f.createdAt}
}

type fakeRow struct {
	id        uuid.UUID
	createdAt time.Time
}

func (r fakeRow) Scan(dest ...any) error {
	*dest[0].(*uuid.UUID) = r.id
	*dest[1].(*time.Time) = r.createdAt
	return nil
}

func TestRouter(t *testing.T) {
	gin.SetMode(gin.TestMode)

	key := authtest.NewKey(t)
	supabase := authtest.NewSupabase(t, key)
	verifier, err := auth.NewVerifier(t.Context(), supabase.URL)
	if err != nil {
		t.Fatal(err)
	}

	createdAt := time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)
	router, err := NewRouter(nil, nil, db.New(fakeDB{createdAt: createdAt}), verifier)
	if err != nil {
		t.Fatal(err)
	}

	userID := uuid.New()
	token := authtest.Sign(t, key, jwt.MapClaims{
		"iss":   supabase.URL + "/auth/v1",
		"aud":   "authenticated",
		"sub":   userID.String(),
		"email": "user@example.com",
		"exp":   time.Now().Add(time.Hour).Unix(),
	})

	unauthorized := map[string]any{"error": "unauthorized"}
	tests := []struct {
		name          string
		path          string
		authorization string
		wantStatus    int
		wantBody      map[string]any
	}{
		{
			name:       "health はトークンが無くても返す",
			path:       "/api/health",
			wantStatus: http.StatusOK,
			wantBody:   map[string]any{"status": "ok"},
		},
		{
			name:       "me はトークンが無いと 401",
			path:       "/api/me",
			wantStatus: http.StatusUnauthorized,
			wantBody:   unauthorized,
		},
		{
			name:          "me は検証できないトークンだと 401",
			path:          "/api/me",
			authorization: "Bearer invalid",
			wantStatus:    http.StatusUnauthorized,
			wantBody:      unauthorized,
		},
		{
			name:          "me はトークンのユーザーを返す",
			path:          "/api/me",
			authorization: "Bearer " + token,
			wantStatus:    http.StatusOK,
			wantBody: map[string]any{
				"id":         userID.String(),
				"email":      "user@example.com",
				"created_at": "2026-10-01T00:00:00Z",
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			if tt.authorization != "" {
				req.Header.Set("Authorization", tt.authorization)
			}
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, tt.wantStatus, rec.Body)
			}
			var got map[string]any
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatalf("decode body %q: %v", rec.Body, err)
			}
			if !reflect.DeepEqual(got, tt.wantBody) {
				t.Errorf("body = %v, want %v", got, tt.wantBody)
			}
			if tt.wantStatus == http.StatusUnauthorized && rec.Header().Get("WWW-Authenticate") != "Bearer" {
				t.Errorf("WWW-Authenticate = %q, want Bearer", rec.Header().Get("WWW-Authenticate"))
			}
		})
	}
}
