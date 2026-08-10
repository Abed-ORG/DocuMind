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

export const searchWorkspaceValidators = [
  body("query")
    .trim()
    .notEmpty()
    .withMessage("Search query is required.")
    .isLength({ max: 2000 })
    .withMessage("Search query cannot exceed 2000 characters."),

  body("limit")
    .optional()
    .isInt({
      min: 1,
      max: 20,
    })
    .withMessage("Limit must be between 1 and 20.")
    .toInt(),
];

export const answerWorkspaceQuestionValidators = [
  ...searchWorkspaceValidators,

  body("documentIds")
    .optional()
    .isArray({ max: 20 })
    .withMessage(
      "Document ids must be an array with at most 20 items."
    ),

  body("documentIds.*")
    .optional()
    .trim()
    .isMongoId()
    .withMessage("Document id is invalid."),

  body("conversationHistory")
    .optional()
    .isArray({
      max: 20,
    })
    .withMessage(
      "Conversation history must be an array with at most 20 messages."
    ),

  body("conversationHistory.*.role")
    .optional()
    .trim()
    .isIn([
      "user",
      "assistant",
    ])
    .withMessage(
      "Conversation history role must be user or assistant."
    ),

  body("conversationHistory.*.content")
    .optional()
    .trim()
    .isLength({ max: 4000 })
    .withMessage(
      "Conversation history content cannot exceed 4000 characters."
    ),

  body("conversationHistory.*.text")
    .optional()
    .trim()
    .isLength({ max: 4000 })
    .withMessage(
      "Conversation history text cannot exceed 4000 characters."
    ),

  body("conversationHistory.*.citations")
    .optional()
    .isArray({ max: 20 })
    .withMessage(
      "Conversation history citations must be an array with at most 20 items."
    ),

  body("conversationHistory.*.citations.*.documentId")
    .optional()
    .trim()
    .isMongoId()
    .withMessage(
      "Conversation history citation document id is invalid."
    ),
];

export const compareWorkspaceDocumentsValidators = [
  body("firstDocumentId")
    .trim()
    .isMongoId()
    .withMessage("First document id is invalid."),

  body("secondDocumentId")
    .trim()
    .isMongoId()
    .withMessage("Second document id is invalid.")
    .custom((secondDocumentId, { req }) => {
      if (secondDocumentId === req.body.firstDocumentId) {
        throw new Error(
          "Choose two different documents to compare."
        );
      }

      return true;
    }),

  body("topic")
    .trim()
    .notEmpty()
    .withMessage("Comparison topic is required.")
    .isLength({ max: 2000 })
    .withMessage(
      "Comparison topic cannot exceed 2000 characters."
    ),

  body("limit")
    .optional()
    .isInt({
      min: 1,
      max: 10,
    })
    .withMessage("Limit must be between 1 and 10.")
    .toInt(),
];
