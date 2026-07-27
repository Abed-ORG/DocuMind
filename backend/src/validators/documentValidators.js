import {
  body,
  param,
} from "express-validator";

export const documentIdValidator = [
  param("documentId")
    .isMongoId()
    .withMessage("Document id is invalid."),
];

export const updateDocumentValidators = [
  body("originalName")
    .trim()
    .notEmpty()
    .withMessage("Document name is required.")
    .isLength({ max: 255 })
    .withMessage(
      "Document name cannot exceed 255 characters."
    ),
];
