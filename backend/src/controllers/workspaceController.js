import Workspace from "../models/Workspace.js";

function formatWorkspace(workspace) {
  return {
    id: workspace._id,
    userId: workspace.userId,
    name: workspace.name,
    description: workspace.description,
    color: workspace.color,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

function buildWorkspaceUpdates(body) {
  const updates = {};

  if (body.name !== undefined) {
    updates.name = body.name;
  }

  if (body.description !== undefined) {
    updates.description = body.description;
  }

  if (body.color !== undefined) {
    updates.color = body.color;
  }

  return updates;
}

export async function createWorkspace(req, res, next) {
  try {
    const {
      name,
      description,
      color,
    } = req.body;

    const workspace = await Workspace.create({
      userId: req.user._id,
      name,
      description,
      color,
    });

    return res.status(201).json({
      success: true,
      message: "Workspace created successfully.",
      workspace: formatWorkspace(workspace),
    });
  } catch (error) {
    next(error);
  }
}

export async function getWorkspaces(req, res, next) {
  try {
    const workspaces = await Workspace.find({
      userId: req.user._id,
    }).sort({
      updatedAt: -1,
    });

    return res.status(200).json({
      success: true,
      workspaces: workspaces.map(formatWorkspace),
    });
  } catch (error) {
    next(error);
  }
}

export async function getWorkspace(req, res, next) {
  try {
    const workspace = await Workspace.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found.",
      });
    }

    return res.status(200).json({
      success: true,
      workspace: formatWorkspace(workspace),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateWorkspace(req, res, next) {
  try {
    const updates = buildWorkspaceUpdates(
      req.body
    );

    const workspace = await Workspace.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Workspace updated successfully.",
      workspace: formatWorkspace(workspace),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteWorkspace(req, res, next) {
  try {
    const workspace = await Workspace.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Workspace deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}
