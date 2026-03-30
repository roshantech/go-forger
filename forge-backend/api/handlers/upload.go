package handlers

import (
	"fmt"
	"io"
	"path/filepath"
	"strings"

	"forge/internal/project"
	"forge/internal/upload"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

// UploadHandler handles project import from ZIP and URL.
// It does NOT touch the existing ProjectHandler.
type UploadHandler struct {
	repo   *project.Repository
	logger *zap.Logger
}

func NewUploadHandler(repo *project.Repository, logger *zap.Logger) *UploadHandler {
	return &UploadHandler{repo: repo, logger: logger}
}

// UploadZip handles POST /api/projects/upload
// Processes the ZIP synchronously and returns the created project.
func (h *UploadHandler) UploadZip(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	file, err := c.FormFile("file")
	if err != nil {
		return badRequest(c, "no file provided — send a ZIP file in the 'file' form field")
	}

	if file.Size > upload.MaxZipBytes {
		return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{
			"error": fmt.Sprintf("file exceeds 100MB limit (%.1f MB uploaded)",
				float64(file.Size)/(1024*1024)),
			"code": "FILE_TOO_LARGE",
		})
	}

	if strings.ToLower(filepath.Ext(file.Filename)) != ".zip" {
		return badRequest(c, "only .zip files are accepted")
	}

	f, err := file.Open()
	if err != nil {
		return internalError(c, "failed to read uploaded file")
	}
	defer f.Close()

	data, err := io.ReadAll(f)
	if err != nil {
		return internalError(c, "failed to read uploaded file")
	}

	result, err := upload.ProcessZip(data)
	if err != nil {
		return badRequest(c, err.Error())
	}

	projectName := strings.TrimSuffix(file.Filename, ".zip")
	if projectName == "" {
		projectName = "uploaded-project"
	}

	proj, err := h.repo.CreateUpload(c.Context(), userID, projectName, "upload", "")
	if err != nil {
		h.logger.Error("create upload project", zap.Error(err))
		return internalError(c, "failed to create project")
	}

	for _, fe := range result.Files {
		if _, err := h.repo.UpsertFile(c.Context(), proj.ID, "/"+fe.Path, fe.Content); err != nil {
			h.logger.Warn("upsert file failed",
				zap.String("path", fe.Path), zap.Error(err))
		}
	}

	if err := h.repo.UpdateLanguage(c.Context(), proj.ID, result.Language); err != nil {
		h.logger.Warn("update language failed", zap.Error(err))
	}
	proj.Language = result.Language

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"project":      proj,
		"file_count":   result.FileCount,
		"language":     result.Language,
		"skipped_dirs": result.SkippedDirs,
		"warnings":     result.Warnings,
	})
}

// ImportFromURL handles POST /api/projects/import
// Body: { "url": "https://github.com/user/repo" }
func (h *UploadHandler) ImportFromURL(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var body struct {
		URL string `json:"url"`
	}
	if err := c.BodyParser(&body); err != nil {
		return badRequest(c, "invalid request body")
	}
	if body.URL == "" {
		return badRequest(c, "url is required")
	}
	if !upload.IsAllowedHost(body.URL) {
		return badRequest(c, "only github.com and gitlab.com URLs are supported")
	}

	result, err := upload.ImportFromURL(body.URL)
	if err != nil {
		h.logger.Error("git import failed", zap.Error(err), zap.String("url", body.URL))
		return badRequest(c, "failed to clone repository: "+err.Error())
	}

	projectName := extractRepoName(body.URL)

	proj, err := h.repo.CreateUpload(c.Context(), userID, projectName, "github", body.URL)
	if err != nil {
		h.logger.Error("create import project", zap.Error(err))
		return internalError(c, "failed to create project")
	}

	for _, fe := range result.Files {
		if _, err := h.repo.UpsertFile(c.Context(), proj.ID, "/"+fe.Path, fe.Content); err != nil {
			h.logger.Warn("upsert file failed",
				zap.String("path", fe.Path), zap.Error(err))
		}
	}

	if err := h.repo.UpdateLanguage(c.Context(), proj.ID, result.Language); err != nil {
		h.logger.Warn("update language failed", zap.Error(err))
	}
	proj.Language = result.Language

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"project":      proj,
		"file_count":   result.FileCount,
		"language":     result.Language,
		"skipped_dirs": result.SkippedDirs,
		"warnings":     result.Warnings,
	})
}

func extractRepoName(url string) string {
	url = strings.TrimSuffix(url, ".git")
	parts := strings.Split(url, "/")
	for i := len(parts) - 1; i >= 0; i-- {
		if parts[i] != "" {
			return parts[i]
		}
	}
	return "imported-project"
}
