import {
  body,
  param,
} from "express-validator";

export const conversationIdValidator = [
  param("conversationId")
    .isMongoId()
    .withMessage("Conversation id is invalid."),
];

export const createConversationValidators = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Conversation title cannot be empty.")
    .isLength({ max: 120 })
    .withMessage(
      "Conversation title cannot exceed 120 characters."
    ),
];

export const updateConversationValidators = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Conversation title is required.")
    .isLength({ max: 120 })
    .withMessage(
      "Conversation title cannot exceed 120 characters."
    ),
];

export const createMessageValidators = [
  body("role")
    .trim()
    .isIn([
      "user",
      "assistant",
    ])
    .withMessage(
      "Message role must be user or assistant."
    ),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Message content is required.")
    .isLength({ max: 20000 })
    .withMessage(
      "Message content cannot exceed 20000 characters."
    ),

  body("citations")
    .optional()
    .isArray({ max: 20 })
    .withMessage(
      "Citations must be an array with at most 20 items."
    ),

  body("citations.*.label")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage(
      "Citation label cannot exceed 20 characters."
    ),

  body("citations.*.citationNumber")
    .optional()
    .isInt({
      min: 1,
    })
    .withMessage(
      "Citation number must be at least 1."
    )
    .toInt(),

  body("citations.*.chunkId")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      "Citation chunk id cannot exceed 100 characters."
    ),

  body("citations.*.documentId")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage(
      "Citation document id cannot exceed 100 characters."
    ),

  body("citations.*.documentName")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage(
      "Citation document name cannot exceed 255 characters."
    ),

  body("citations.*.pageNumber")
    .optional()
    .isInt({
      min: 1,
    })
    .withMessage(
      "Citation page number must be at least 1."
    )
    .toInt(),

  body("citations.*.chunkIndex")
    .optional()
    .isInt({
      min: 0,
    })
    .withMessage(
      "Citation chunk index cannot be negative."
    )
    .toInt(),

  body("citations.*.sectionHeader")
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage(
      "Citation section header cannot exceed 300 characters."
    ),

  body("citations.*.score")
    .optional()
    .isFloat()
    .withMessage("Citation score must be numeric.")
    .toFloat(),

  body("citations.*.text")
    .optional()
    .trim()
    .isLength({ max: 4000 })
    .withMessage(
      "Citation text cannot exceed 4000 characters."
    ),
];
