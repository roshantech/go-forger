package router

import (
	"forge/api/handlers"
	"forge/api/middleware"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

type Deps struct {
	AuthHandler    *handlers.AuthHandler
	ASTHandler     *handlers.ASTHandler
	ProjectHandler *handlers.ProjectHandler
	UploadHandler  *handlers.UploadHandler
	UsageHandler   *handlers.UsageHandler
	JWTSecret      string
	Logger         *zap.Logger
}

func Setup(deps *Deps) *fiber.App {
	app := fiber.New(fiber.Config{
		BodyLimit: 110 * 1024 * 1024, // 110 MB — allows up to 100 MB ZIP uploads
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error(), "code": "INTERNAL_ERROR"})
		},
	})

	api := app.Group("/api")

	// ── Public auth routes ────────────────────────────────────
	auth := api.Group("/auth")
	auth.Post("/register", deps.AuthHandler.Register)
	auth.Post("/login", deps.AuthHandler.Login)
	auth.Post("/forgot-password", deps.AuthHandler.ForgotPassword)
	auth.Post("/reset-password", deps.AuthHandler.ResetPassword)

	// ── AST inspection (public) ───────────────────────────────
	astGroup := api.Group("/ast")
	astGroup.Post("/inspect", deps.ASTHandler.Inspect)
	astGroup.Post("/inspect-raw", deps.ASTHandler.InspectRaw)
	astGroup.Post("/tree", deps.ASTHandler.Tree)
	astGroup.Post("/tree-raw", deps.ASTHandler.TreeRaw)

	// ── Protected routes (JWT required) ──────────────────────
	protected := api.Group("", middleware.JWTMiddleware(deps.JWTSecret))

	protected.Get("/auth/me", deps.AuthHandler.GetMe)

	// Projects
	projects := protected.Group("/projects")
	projects.Post("/", deps.ProjectHandler.Create)
	projects.Get("/", deps.ProjectHandler.List)
	projects.Post("/upload", deps.UploadHandler.UploadZip)
	projects.Post("/import", deps.UploadHandler.ImportFromURL)
	projects.Get("/:id", deps.ProjectHandler.Get)
	projects.Delete("/:id", deps.ProjectHandler.Delete)
	projects.Post("/:id/files", deps.ProjectHandler.UploadFiles)
	projects.Get("/:id/files/*", deps.ProjectHandler.GetFile)
	projects.Post("/:id/usages", deps.UsageHandler.FindUsages)

	return app
}
