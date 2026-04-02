package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"forge/api/handlers"
	"forge/api/router"
	"forge/internal/auth"
	"forge/internal/config"
	"forge/internal/db"
	"forge/internal/logger"
	"forge/internal/project"

	"go.uber.org/zap"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		os.Exit(1)
	}

	log, err := logger.New(cfg.Environment)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to create logger: %v\n", err)
		os.Exit(1)
	}
	defer log.Sync()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	database, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal("failed to connect to database", zap.Error(err))
	}
	defer database.Close()

	userRepo    := auth.NewPostgresUserRepository(database)
	projectRepo := project.NewRepository(database)

	authHandler    := handlers.NewAuthHandler(userRepo, cfg.JWTSecret, log)
	astHandler     := handlers.NewASTHandler(log)
	projectHandler := handlers.NewProjectHandler(projectRepo, log)
	uploadHandler  := handlers.NewUploadHandler(projectRepo, log)
	usageHandler   := handlers.NewUsageHandler(projectRepo, log)

	app := router.Setup(&router.Deps{
		AuthHandler:    authHandler,
		ASTHandler:     astHandler,
		ProjectHandler: projectHandler,
		UploadHandler:  uploadHandler,
		UsageHandler:   usageHandler,
		JWTSecret:      cfg.JWTSecret,
		Logger:         log,
	})

	go func() {
		log.Info("server starting", zap.String("port", cfg.ServerPort))
		if err := app.Listen(":" + cfg.ServerPort); err != nil {
			log.Fatal("server failed", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down server...")
	if err := app.ShutdownWithTimeout(10 * time.Second); err != nil {
		log.Fatal("server forced to shutdown", zap.Error(err))
	}
	log.Info("server stopped")
}
