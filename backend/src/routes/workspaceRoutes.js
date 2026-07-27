import { Router } from "express";

import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  getWorkspaces,
  updateWorkspace,
} from "../controllers/workspaceController.js";
import {
  createDocument,
  deleteDocument,
  getDocumentPreview,
  getDocuments,
  updateDocument,
} from "../controllers/documentController.js";

import { protect } from "../middleware/authMiddleware.js";
import { uploadDocumentFile } from "../middleware/documentUpload.js";
import { validateRequest } from "../middleware/validateRequest.js";

import {
  documentIdValidator,
  updateDocumentValidators,
} from "../validators/documentValidators.js";
import {
  createWorkspaceValidators,
  updateWorkspaceValidators,
  workspaceIdValidator,
} from "../validators/workspaceValidators.js";

const router = Router();

router.use(protect);

router
  .route("/")
  .get(getWorkspaces)
  .post(
    createWorkspaceValidators,
    validateRequest,
    createWorkspace
  );

router
  .route("/:id/documents")
  .get(
    workspaceIdValidator,
    validateRequest,
    getDocuments
  )
  .post(
    workspaceIdValidator,
    validateRequest,
    uploadDocumentFile,
    createDocument
  );

router
  .route("/:id/documents/:documentId")
  .put(
    workspaceIdValidator,
    documentIdValidator,
    updateDocumentValidators,
    validateRequest,
    updateDocument
  )
  .delete(
    workspaceIdValidator,
    documentIdValidator,
    validateRequest,
    deleteDocument
  );

router.get(
  "/:id/documents/:documentId/preview",
  workspaceIdValidator,
  documentIdValidator,
  validateRequest,
  getDocumentPreview
);

router
  .route("/:id")
  .get(
    workspaceIdValidator,
    validateRequest,
    getWorkspace
  )
  .put(
    workspaceIdValidator,
    updateWorkspaceValidators,
    validateRequest,
    updateWorkspace
  )
  .delete(
    workspaceIdValidator,
    validateRequest,
    deleteWorkspace
  );

export default router;
