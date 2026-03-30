package handlers

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"forge/internal/auth"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	repo      auth.UserRepository
	jwtSecret string
	logger    *zap.Logger
	validate  *validator.Validate
}

func NewAuthHandler(repo auth.UserRepository, jwtSecret string, logger *zap.Logger) *AuthHandler {
	return &AuthHandler{
		repo:      repo,
		jwtSecret: jwtSecret,
		logger:    logger,
		validate:  validator.New(),
	}
}

type registerRequest struct {
	Email    string `json:"email" validate:"required,email,max=100"`
	Password string `json:"password" validate:"required,min=8,max=72"`
}

type loginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type forgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type resetPasswordRequest struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"newPassword" validate:"required,min=8,max=72"`
}

type authResponse struct {
	Token string     `json:"token"`
	User  *auth.User `json:"user"`
}

// Register handles POST /api/auth/register
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req registerRequest
	if err := c.BodyParser(&req); err != nil {
		return badRequest(c, "invalid request body")
	}

	if err := h.validate.Struct(req); err != nil {
		return badRequest(c, "invalid email or password (min 8 chars)")
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		h.logger.Error("failed to hash password", zap.Error(err))
		return internalError(c, "failed to create account")
	}

	ctx := context.Background()
	user, err := h.repo.Create(ctx, req.Email, string(hash))
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			return conflict(c, "email already registered")
		}
		h.logger.Error("failed to create user", zap.Error(err))
		return internalError(c, "failed to create account")
	}

	token, err := h.generateToken(user.ID)
	if err != nil {
		h.logger.Error("failed to generate token", zap.Error(err))
		return internalError(c, "failed to create account")
	}

	return c.Status(201).JSON(authResponse{Token: token, User: user})
}

// Login handles POST /api/auth/login
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return badRequest(c, "invalid request body")
	}

	if err := h.validate.Struct(req); err != nil {
		return badRequest(c, "email and password are required")
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	ctx := context.Background()
	user, err := h.repo.GetByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || strings.Contains(err.Error(), "no rows") {
			return unauthorized(c, "invalid email or password")
		}
		h.logger.Error("failed to get user", zap.Error(err), zap.String("email", req.Email))
		return internalError(c, "login failed")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return unauthorized(c, "invalid email or password")
	}

	token, err := h.generateToken(user.ID)
	if err != nil {
		h.logger.Error("failed to generate token", zap.Error(err))
		return internalError(c, "login failed")
	}

	return c.Status(200).JSON(authResponse{Token: token, User: user})
}

// ForgotPassword handles POST /api/auth/forgot-password
func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var req forgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return badRequest(c, "invalid request body")
	}

	if err := h.validate.Struct(req); err != nil {
		return badRequest(c, "valid email is required")
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	ctx := context.Background()

	// Always return 200 to prevent email enumeration
	user, err := h.repo.GetByEmail(ctx, req.Email)
	if err != nil {
		return c.Status(200).JSON(fiber.Map{"message": "if that email exists, a reset link has been sent"})
	}

	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		h.logger.Error("failed to generate reset token", zap.Error(err))
		return internalError(c, "failed to process request")
	}
	resetToken := hex.EncodeToString(tokenBytes)

	expiresAt := time.Now().Add(1 * time.Hour)
	if err := h.repo.CreatePasswordReset(ctx, user.ID, resetToken, expiresAt); err != nil {
		h.logger.Error("failed to create password reset", zap.Error(err), zap.String("userID", user.ID))
		return internalError(c, "failed to process request")
	}

	// TODO: Send email with reset link containing the token
	h.logger.Info("password reset token generated",
		zap.String("userID", user.ID),
		zap.String("token", resetToken),
	)

	return c.Status(200).JSON(fiber.Map{
		"message": "if that email exists, a reset link has been sent",
		"token":   resetToken, // Remove this in production — only for dev/testing
	})
}

// ResetPassword handles POST /api/auth/reset-password
func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req resetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return badRequest(c, "invalid request body")
	}

	if err := h.validate.Struct(req); err != nil {
		return badRequest(c, "token and new password (min 8 chars) are required")
	}

	ctx := context.Background()

	pr, err := h.repo.GetPasswordReset(ctx, req.Token)
	if err != nil {
		return unauthorized(c, "invalid or expired reset token")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		h.logger.Error("failed to hash password", zap.Error(err))
		return internalError(c, "failed to reset password")
	}

	if err := h.repo.UpdatePassword(ctx, pr.UserID, string(hash)); err != nil {
		h.logger.Error("failed to update password", zap.Error(err), zap.String("userID", pr.UserID))
		return internalError(c, "failed to reset password")
	}

	if err := h.repo.MarkPasswordResetUsed(ctx, req.Token); err != nil {
		h.logger.Error("failed to mark reset token used", zap.Error(err))
	}

	return c.Status(200).JSON(fiber.Map{"message": "password reset successfully"})
}

// GetMe handles GET /api/auth/me
func (h *AuthHandler) GetMe(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return unauthorized(c, "not authenticated")
	}

	ctx := context.Background()
	user, err := h.repo.GetByID(ctx, userID)
	if err != nil {
		h.logger.Error("failed to get user", zap.Error(err), zap.String("userID", userID))
		return internalError(c, "failed to get user")
	}

	return c.Status(200).JSON(user)
}

func (h *AuthHandler) generateToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.jwtSecret))
}
