package api

import (
	"context"

	"github.com/gesop0n/repat/backend/internal/db"
	"github.com/gesop0n/repat/backend/internal/oapi"
)

// server は api/openapi.yaml の操作を実装する
// handler が error を返すと、内容はログにだけ残し、500 を返す (NewRouter の HandlerErrorFunc)
type server struct {
	queries *db.Queries
}

var _ oapi.StrictServerInterface = (*server)(nil)

func (s *server) GetHealth(context.Context, oapi.GetHealthRequestObject) (oapi.GetHealthResponseObject, error) {
	return oapi.GetHealth200JSONResponse{Status: "ok"}, nil
}
