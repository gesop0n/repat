package config

import (
	"fmt"

	"github.com/caarlos0/env/v11"
)

// Env はアプリケーションの実行環境
type Env string

const (
	EnvDevelopment Env = "development"
	EnvProduction  Env = "production"
)

// UnmarshalText は REPAT_ENV に想定外の値が渡されたら起動時にエラーにする
func (e *Env) UnmarshalText(text []byte) error {
	switch v := Env(text); v {
	case EnvDevelopment, EnvProduction:
		*e = v
		return nil
	default:
		return fmt.Errorf("must be %q or %q, got %q", EnvDevelopment, EnvProduction, v)
	}
}

type Config struct {
	Env  Env `env:"REPAT_ENV" envDefault:"development"`
	Port int `env:"REPAT_SERVER_PORT" envDefault:"8080"`
	// カンマ区切りの IP / CIDR。未設定なら X-Forwarded-For を信用しない
	TrustedProxies []string `env:"REPAT_TRUSTED_PROXIES"`
	DatabaseURL    string   `env:"DATABASE_URL,notEmpty"`
	// アクセストークンの発行元 (iss) と JWKS の取得先に使う
	SupabaseURL string `env:"SUPABASE_URL,notEmpty"`
}

func Load() (Config, error) {
	var cfg Config
	if err := env.Parse(&cfg); err != nil {
		return Config{}, fmt.Errorf("parse env: %w", err)
	}
	return cfg, nil
}
