import { Router } from "express";

import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  getWorkspaces,
  updateWorkspace,
} from "../controllers/workspaceController.js";
import {
  createConversation,
  createConversationMessage,
  deleteConversation,
  getConversationMessages,
  getConversations,
  updateConversation,
} from "../controllers/conversationController.js";
import {
  answerWorkspace,
  searchWorkspace,
} from "../controllers/searchController.js";
import {
  createDocument,
  deleteDocument,
  getDocumentPreview,
  getDocuments,
  reprocessDocument,
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
  conversationIdValidator,
  createConversationValidators,
  createMessageValidators,
  updateConversationValidators,
} from "../validators/conversationValidators.js";
import {
  answerWorkspaceQuestionValidators,
  createWorkspaceValidators,
  searchWorkspaceValidators,
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

router.post(
  "/:id/documents/:documentId/reprocess",
  workspaceIdValidator,
  documentIdValidator,
  validateRequest,
  reprocessDocument
);

router.post(
  "/:id/search",
  workspaceIdValidator,
  searchWorkspaceValidators,
  validateRequest,
  searchWorkspace
);

router.post(
  "/:id/answer",
  workspaceIdValidator,
  answerWorkspaceQuestionValidators,
  validateRequest,
  answerWorkspace
);

router
  .route("/:id/conversations")
  .get(
    workspaceIdValidator,
    validateRequest,
    getConversations
  )
  .post(
    workspaceIdValidator,
    createConversationValidators,
    validateRequest,
    createConversation
  );

router
  .route("/:id/conversations/:conversationId")
  .put(
    workspaceIdValidator,
    conversationIdValidator,
    updateConversationValidators,
    validateRequest,
    updateConversation
  )
  .delete(
    workspaceIdValidator,
    conversationIdValidator,
    validateRequest,
    deleteConversation
  );

router
  .route("/:id/conversations/:conversationId/messages")
  .get(
    workspaceIdValidator,
    conversationIdValidator,
    validateRequest,
    getConversationMessages
  )
  .post(
    workspaceIdValidator,
    conversationIdValidator,
    createMessageValidators,
    validateRequest,
    createConversationMessage
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
