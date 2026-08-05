import { Router } from "express";

import {
  getDocumentSummaries,
  summarizeDocument,
} from "../controllers/documentController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  documentIdValidator,
  summarizeDocumentValidators,
} from "../validators/documentValidators.js";

const router = Router();

router.use(protect);

router.get(
  "/:documentId/summaries",
  documentIdValidator,
  validateRequest,
  getDocumentSummaries
);

router.post(
  "/:documentId/summarize",
  documentIdValidator,
  summarizeDocumentValidators,
  validateRequest,
  summarizeDocument
);

export default router;
