import {
  body,
  param,
} from "express-validator";

import {
  isSummaryLevel,
  normalizeSummaryLevel,
} from "../services/summaryService.js";

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

export const summarizeDocumentValidators = [
  body("level").custom((value, { req }) => {
    req.body = req.body ?? {};
    const level = value ?? req.query?.level;

    if (!isSummaryLevel(level)) {
      throw new Error(
        "Summary level must be one-liner, executive, or detailed."
      );
    }

    req.body.level = normalizeSummaryLevel(level);
    return true;
  }),
  body("force")
    .optional()
    .isBoolean()
    .withMessage("Force must be true or false.")
    .toBoolean(),
];
