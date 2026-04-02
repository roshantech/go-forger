package handlers

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"

	"forge/internal/project"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

type UsageHandler struct {
	repo   *project.Repository
	logger *zap.Logger
}

func NewUsageHandler(repo *project.Repository, logger *zap.Logger) *UsageHandler {
	return &UsageHandler{repo: repo, logger: logger}
}

// ── Response types ────────────────────────────────────────────

type Usage struct {
	FilePath string `json:"file"`
	Line     int    `json:"line"`
}

type UsageGraphNode struct {
	ID    string `json:"id"`
	Type  string `json:"type"`  // "symbol" | "file"
	Label string `json:"label"`
}

type UsageGraphEdge struct {
	ID     string `json:"id"`
	Source string `json:"source"`
	Target string `json:"target"`
}

type UsageResponse struct {
	Nodes  []UsageGraphNode `json:"nodes"`
	Edges  []UsageGraphEdge `json:"edges"`
	Usages []Usage          `json:"usages"`
}

// POST /api/projects/:id/usages
func (h *UsageHandler) FindUsages(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	projectID := c.Params("id")

	var req struct {
		Symbol string `json:"symbol"`
		Type   string `json:"type"`
	}
	if err := c.BodyParser(&req); err != nil {
		return badRequest(c, "invalid request body")
	}
	if req.Symbol == "" {
		return badRequest(c, "symbol is required")
	}

	// Verify ownership and get all files in one call
	p, err := h.repo.GetByID(c.Context(), projectID, userID)
	if err != nil {
		if project.IsNotFound(err) {
			return notFound(c, "project not found")
		}
		h.logger.Error("get project for usages", zap.Error(err))
		return internalError(c, "failed to verify project")
	}

	// Find usages across all .go files
	var usages []Usage
	for _, f := range p.Files {
		if filepath.Ext(f.Path) != ".go" {
			continue
		}
		found := findUsagesInFile(f.Path, f.Content, req.Symbol, req.Type)
		usages = append(usages, found...)
	}

	// Build graph: one symbol node + one node per referencing file
	symbolNodeID := "symbol-" + req.Symbol
	nodes := []UsageGraphNode{
		{ID: symbolNodeID, Type: "symbol", Label: req.Symbol},
	}
	edges := []UsageGraphEdge{}
	seenFile := map[string]bool{}

	for i, u := range usages {
		fileNodeID := "file-" + u.FilePath
		if !seenFile[fileNodeID] {
			seenFile[fileNodeID] = true
			nodes = append(nodes, UsageGraphNode{
				ID:    fileNodeID,
				Type:  "file",
				Label: filepath.Base(u.FilePath),
			})
		}
		edges = append(edges, UsageGraphEdge{
			ID:     fmt.Sprintf("e-%d", i),
			Source: fileNodeID,
			Target: symbolNodeID,
		})
	}

	return c.JSON(UsageResponse{
		Nodes:  nodes,
		Edges:  edges,
		Usages: usages,
	})
}

// findUsagesInFile parses one .go file and returns all positions where symbol is referenced.
func findUsagesInFile(path, content, symbol, symbolType string) []Usage {
	fset := token.NewFileSet()
	f, err := parser.ParseFile(fset, path, content, 0)
	if err != nil {
		return nil
	}

	// Deduplicate by line within this file
	seenLine := map[int]bool{}
	var usages []Usage

	record := func(pos token.Pos) {
		p := fset.Position(pos)
		if !seenLine[p.Line] {
			seenLine[p.Line] = true
			usages = append(usages, Usage{FilePath: path, Line: p.Line})
		}
	}

	ast.Inspect(f, func(n ast.Node) bool {
		if n == nil {
			return false
		}

		switch node := n.(type) {
		case *ast.CallExpr:
			// Function call site: Func() or pkg.Func()
			switch fun := node.Fun.(type) {
			case *ast.Ident:
				if fun.Name == symbol {
					record(fun.Pos())
				}
			case *ast.SelectorExpr:
				if fun.Sel.Name == symbol {
					record(fun.Sel.Pos())
				}
			}

		case *ast.Ident:
			// For types/structs and generic fallback — skip pure function searches
			// to avoid double-counting call expression idents
			if symbolType == "function" {
				break
			}
			if node.Name == symbol {
				record(node.Pos())
			}
		}
		return true
	})

	return usages
}
