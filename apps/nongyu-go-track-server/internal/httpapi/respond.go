package httpapi

import (
	"encoding/json"
	"net/http"
)

type successBody struct {
	OK   bool `json:"ok"`
	Data any  `json:"data"`
}

type failBody struct {
	OK    bool `json:"ok"`
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func writeOK(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(successBody{OK: true, Data: data})
}

func writeFail(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	var body failBody
	body.OK = false
	body.Error.Code = code
	body.Error.Message = message
	_ = json.NewEncoder(w).Encode(body)
}
