import Workspace from "../models/Workspace.js";
import { answerWorkspaceQuestion } from "../services/ragAnswerService.js";
import { searchWorkspaceChunks } from "../services/vectorSearchService.js";

async function findUserWorkspace(req) {
  return Workspace.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
}

function sendWorkspaceNotFound(res) {
  return res.status(404).json({
    success: false,
    message: "Workspace not found.",
  });
}

export async function searchWorkspace(req, res, next) {
  try {
    const workspace = await findUserWorkspace(req);

    if (!workspace) {
      return sendWorkspaceNotFound(res);
    }

    const results = await searchWorkspaceChunks({
      workspaceId: workspace._id,
      query: req.body.query,
      limit: req.body.limit,
    });

    return res.status(200).json({
      success: true,
      query: req.body.query.trim(),
      results,
    });
  } catch (error) {
    next(error);
  }
}

export async function answerWorkspace(
  req,
  res,
  next
) {
  try {
    const workspace = await findUserWorkspace(req);

    if (!workspace) {
      return sendWorkspaceNotFound(res);
    }

    const result = await answerWorkspaceQuestion({
      workspaceId: workspace._id,
      question: req.body.query,
      limit: req.body.limit,
      conversationHistory:
        req.body.conversationHistory,
    });

    return res.status(200).json({
      success: true,
      query: req.body.query.trim(),
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
