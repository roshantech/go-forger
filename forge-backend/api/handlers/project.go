package handlers

import (
	"forge/internal/project"
	"io"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

type ProjectHandler struct {
	repo   *project.Repository
	logger *zap.Logger
}

func NewProjectHandler(repo *project.Repository, logger *zap.Logger) *ProjectHandler {
	return &ProjectHandler{repo: repo, logger: logger}
}

// POST /api/projects
func (h *ProjectHandler) Create(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req struct {
		Name        string `json:"name"        validate:"required,min=1,max=100"`
		Description string `json:"description"`
		Language    string `json:"language"`
	}
	if err := c.BodyParser(&req); err != nil {
		return badRequest(c, "invalid request body")
	}
	if req.Name == "" {
		return badRequest(c, "name is required")
	}
	if req.Language == "" {
		req.Language = "go"
	}

	p, err := h.repo.Create(c.Context(), userID, req.Name, req.Description, req.Language)
	if err != nil {
		h.logger.Error("create project", zap.Error(err))
		return internalError(c, "failed to create project")
	}
	return c.Status(fiber.StatusCreated).JSON(p)
}

// GET /api/projects
func (h *ProjectHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	projects, err := h.repo.ListByUser(c.Context(), userID)
	if err != nil {
		h.logger.Error("list projects", zap.Error(err))
		return internalError(c, "failed to list projects")
	}
	return c.JSON(fiber.Map{"projects": projects})
}

// GET /api/projects/:id
func (h *ProjectHandler) Get(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	p, err := h.repo.GetByID(c.Context(), id, userID)
	if err != nil {
		if project.IsNotFound(err) {
			return notFound(c, "project not found")
		}
		h.logger.Error("get project", zap.Error(err))
		return internalError(c, "failed to get project")
	}
	return c.JSON(p)
}

// DELETE /api/projects/:id
func (h *ProjectHandler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	if err := h.repo.Delete(c.Context(), id, userID); err != nil {
		if project.IsNotFound(err) {
			return notFound(c, "project not found")
		}
		h.logger.Error("delete project", zap.Error(err))
		return internalError(c, "failed to delete project")
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// POST /api/projects/:id/files  — multipart upload of one or more .go files
func (h *ProjectHandler) UploadFiles(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	projectID := c.Params("id")

	// Verify ownership
	if _, err := h.repo.GetByID(c.Context(), projectID, userID); err != nil {
		if project.IsNotFound(err) {
			return notFound(c, "project not found")
		}
		return internalError(c, "failed to verify project")
	}

	form, err := c.MultipartForm()
	if err != nil {
		return badRequest(c, "expected multipart/form-data")
	}

	files := form.File["files"]
	if len(files) == 0 {
		return badRequest(c, "no files provided (field name: files)")
	}

	var uploaded []project.ProjectFile
	for _, fh := range files {
		f, err := fh.Open()
		if err != nil {
			return internalError(c, "could not read file "+fh.Filename)
		}
		content, err := io.ReadAll(f)
		f.Close()
		if err != nil {
			return internalError(c, "could not read file "+fh.Filename)
		}

		pf, err := h.repo.UpsertFile(c.Context(), projectID, fh.Filename, string(content))
		if err != nil {
			h.logger.Error("upsert file", zap.String("path", fh.Filename), zap.Error(err))
			return internalError(c, "failed to save file "+fh.Filename)
		}
		uploaded = append(uploaded, *pf)
	}

	return c.JSON(fiber.Map{"uploaded": uploaded})
}

// GET /api/projects/:id/files/:path  — retrieve a single file's content
func (h *ProjectHandler) GetFile(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	projectID := c.Params("id")
	path := c.Params("*") // wildcard captures nested paths

	if _, err := h.repo.GetByID(c.Context(), projectID, userID); err != nil {
		if project.IsNotFound(err) {
			return notFound(c, "project not found")
		}
		return internalError(c, "failed to verify project")
	}

	pf, err := h.repo.GetFile(c.Context(), projectID, path)
	if err != nil {
		return notFound(c, "file not found")
	}
	return c.JSON(pf)
}
