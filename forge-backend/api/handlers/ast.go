package handlers

import (
	"strings"

	goast "forge/internal/ast"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

type ASTHandler struct {
	logger *zap.Logger
}

func NewASTHandler(logger *zap.Logger) *ASTHandler {
	return &ASTHandler{logger: logger}
}

// Inspect handles POST /api/ast/inspect
// Accepts a .go file upload, parses it, and returns the AST summary.
func (h *ASTHandler) Inspect(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return badRequest(c, "file is required")
	}

	if !strings.HasSuffix(file.Filename, ".go") {
		return badRequest(c, "only .go files are supported")
	}

	// 5MB limit
	if file.Size > 5*1024*1024 {
		return badRequest(c, "file size must be under 5MB")
	}

	f, err := file.Open()
	if err != nil {
		h.logger.Error("failed to open uploaded file", zap.Error(err))
		return internalError(c, "failed to read file")
	}
	defer f.Close()

	buf := make([]byte, file.Size)
	if _, err := f.Read(buf); err != nil {
		h.logger.Error("failed to read uploaded file", zap.Error(err))
		return internalError(c, "failed to read file")
	}

	inspection, err := goast.ParseGoFile(file.Filename, string(buf))
	if err != nil {
		h.logger.Error("failed to parse go file", zap.Error(err), zap.String("file", file.Filename))
		return badRequest(c, "failed to parse file: "+err.Error())
	}

	return c.Status(200).JSON(inspection)
}

// InspectRaw handles POST /api/ast/inspect-raw
// Accepts raw Go source code as a JSON body and returns the AST summary.
func (h *ASTHandler) InspectRaw(c *fiber.Ctx) error {
	var req struct {
		FileName string `json:"fileName"`
		Content  string `json:"content"`
	}

	if err := c.BodyParser(&req); err != nil {
		return badRequest(c, "invalid request body")
	}

	if req.Content == "" {
		return badRequest(c, "content is required")
	}

	if req.FileName == "" {
		req.FileName = "input.go"
	}

	if len(req.Content) > 5*1024*1024 {
		return badRequest(c, "content must be under 5MB")
	}

	inspection, err := goast.ParseGoFile(req.FileName, req.Content)
	if err != nil {
		h.logger.Error("failed to parse go source", zap.Error(err))
		return badRequest(c, "failed to parse source: "+err.Error())
	}

	return c.Status(200).JSON(inspection)
}

// Tree handles POST /api/ast/tree
// Returns the full recursive AST tree for React Flow visualisation.
func (h *ASTHandler) Tree(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return badRequest(c, "file is required")
	}

	if !strings.HasSuffix(file.Filename, ".go") {
		return badRequest(c, "only .go files are supported")
	}

	if file.Size > 5*1024*1024 {
		return badRequest(c, "file size must be under 5MB")
	}

	f, err := file.Open()
	if err != nil {
		h.logger.Error("failed to open uploaded file", zap.Error(err))
		return internalError(c, "failed to read file")
	}
	defer f.Close()

	buf := make([]byte, file.Size)
	if _, err := f.Read(buf); err != nil {
		h.logger.Error("failed to read uploaded file", zap.Error(err))
		return internalError(c, "failed to read file")
	}

	tree, err := goast.BuildTree(file.Filename, string(buf))
	if err != nil {
		h.logger.Error("failed to build ast tree", zap.Error(err), zap.String("file", file.Filename))
		return badRequest(c, "failed to parse file: "+err.Error())
	}

	return c.Status(200).JSON(tree)
}

// TreeRaw handles POST /api/ast/tree-raw
// Accepts raw Go source and returns the full recursive AST tree.
func (h *ASTHandler) TreeRaw(c *fiber.Ctx) error {
	var req struct {
		FileName string `json:"fileName"`
		Content  string `json:"content"`
	}

	if err := c.BodyParser(&req); err != nil {
		return badRequest(c, "invalid request body")
	}

	if req.Content == "" {
		return badRequest(c, "content is required")
	}

	if req.FileName == "" {
		req.FileName = "input.go"
	}

	if len(req.Content) > 5*1024*1024 {
		return badRequest(c, "content must be under 5MB")
	}

	tree, err := goast.BuildTree(req.FileName, req.Content)
	if err != nil {
		h.logger.Error("failed to build ast tree", zap.Error(err))
		return badRequest(c, "failed to parse source: "+err.Error())
	}

	return c.Status(200).JSON(tree)
}
