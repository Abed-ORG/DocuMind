import {
  body,
  param,
} from "express-validator";

const hexColorPattern =
  /^#[0-9A-Fa-f]{6}$/;

export const workspaceIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("Workspace id is invalid."),
];

export const createWorkspaceValidators = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Workspace name is required.")
    .isLength({ max: 80 })
    .withMessage("Workspace name cannot exceed 80 characters."),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage(
      "Workspace description cannot exceed 500 characters."
    ),

  body("color")
    .optional()
    .trim()
    .matches(hexColorPattern)
    .withMessage("Workspace color must be a valid hex color."),
];

export const updateWorkspaceValidators = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Workspace name cannot be empty.")
    .isLength({ max: 80 })
    .withMessage("Workspace name cannot exceed 80 characters."),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage(
      "Workspace description cannot exceed 500 characters."
    ),

  body("color")
    .optional()
    .trim()
    .matches(hexColorPattern)
    .withMessage("Workspace color must be a valid hex color."),
];
