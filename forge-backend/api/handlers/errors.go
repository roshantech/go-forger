package handlers

import "github.com/gofiber/fiber/v2"

func badRequest(c *fiber.Ctx, message string) error {
	return c.Status(400).JSON(fiber.Map{"error": message, "code": "BAD_REQUEST"})
}

func unauthorized(c *fiber.Ctx, message string) error {
	return c.Status(401).JSON(fiber.Map{"error": message, "code": "UNAUTHORIZED"})
}

func notFound(c *fiber.Ctx, message string) error {
	return c.Status(404).JSON(fiber.Map{"error": message, "code": "NOT_FOUND"})
}

func conflict(c *fiber.Ctx, message string) error {
	return c.Status(409).JSON(fiber.Map{"error": message, "code": "CONFLICT"})
}

func internalError(c *fiber.Ctx, message string) error {
	return c.Status(500).JSON(fiber.Map{"error": message, "code": "INTERNAL_ERROR"})
}
