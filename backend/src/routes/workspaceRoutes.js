import { Router } from "express";

import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  getWorkspaces,
  updateWorkspace,
} from "../controllers/workspaceController.js";

import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";

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
