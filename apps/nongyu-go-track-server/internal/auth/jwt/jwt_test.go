package jwt

import (
	"testing"
	"time"

	jwtv5 "github.com/golang-jwt/jwt/v5"
)

func sign(t *testing.T, secret string, claims jwtv5.MapClaims) string {
	t.Helper()
	tok := jwtv5.NewWithClaims(jwtv5.SigningMethodHS256, claims)
	s, err := tok.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestParseAppToken_OK(t *testing.T) {
	secret := "test-secret-key-16"
	raw := sign(t, secret, jwtv5.MapClaims{
		"uid":          float64(42),
		"typ":          "app",
		"studentNo":    "202300001",
		"tokenVersion": float64(1),
		"exp":          time.Now().Add(time.Hour).Unix(),
	})
	got, err := ParseAppToken(raw, secret)
	if err != nil {
		t.Fatal(err)
	}
	if got.UID != 42 || got.StudentNo != "202300001" {
		t.Fatalf("got %+v", got)
	}
}

func TestParseAppToken_RejectsAdminTyp(t *testing.T) {
	secret := "test-secret-key-16"
	raw := sign(t, secret, jwtv5.MapClaims{
		"uid": float64(1),
		"typ": "admin",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	if _, err := ParseAppToken(raw, secret); err == nil {
		t.Fatal("expected error")
	}
}

func TestParseAppToken_RejectsExpired(t *testing.T) {
	secret := "test-secret-key-16"
	raw := sign(t, secret, jwtv5.MapClaims{
		"uid": float64(1),
		"typ": "app",
		"exp": time.Now().Add(-time.Hour).Unix(),
	})
	if _, err := ParseAppToken(raw, secret); err == nil {
		t.Fatal("expected error")
	}
}

func TestParseAppToken_RejectsWrongAlg(t *testing.T) {
	secret := "test-secret-key-16"
	tok := jwtv5.NewWithClaims(jwtv5.SigningMethodNone, jwtv5.MapClaims{
		"uid": float64(1),
		"typ": "app",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	raw, err := tok.SignedString(jwtv5.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ParseAppToken(raw, secret); err == nil {
		t.Fatal("expected error")
	}
}
