package jwt

import (
	"encoding/json"
	"fmt"
	"strconv"

	jwtv5 "github.com/golang-jwt/jwt/v5"
)

// Claims 一期只强制 uid + typ=app；不校验 tokenVersion。
type Claims struct {
	UID       int64
	StudentNo string
}

// ParseAppToken 校验 HS256 签名、exp、typ=app，并解析数字 uid。
func ParseAppToken(tokenString, secret string) (*Claims, error) {
	parser := jwtv5.NewParser(jwtv5.WithValidMethods([]string{jwtv5.SigningMethodHS256.Alg()}))
	token, err := parser.Parse(tokenString, func(t *jwtv5.Token) (any, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return nil, fmt.Errorf("jwt parse: %w", err)
	}
	mapClaims, ok := token.Claims.(jwtv5.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}
	typ, _ := mapClaims["typ"].(string)
	if typ != "app" {
		return nil, fmt.Errorf("invalid token typ")
	}
	uid, err := asInt64(mapClaims["uid"])
	if err != nil || uid <= 0 {
		return nil, fmt.Errorf("invalid uid")
	}
	studentNo, _ := mapClaims["studentNo"].(string)
	return &Claims{UID: uid, StudentNo: studentNo}, nil
}

func asInt64(v any) (int64, error) {
	switch n := v.(type) {
	case float64:
		return int64(n), nil
	case int64:
		return n, nil
	case json.Number:
		return n.Int64()
	case string:
		return strconv.ParseInt(n, 10, 64)
	default:
		return 0, fmt.Errorf("unsupported uid type %T", v)
	}
}
