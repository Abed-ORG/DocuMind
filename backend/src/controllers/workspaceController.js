import Document from "../models/Document.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import { cascadeDeleteWorkspaceData } from "../services/workspaceCascadeService.js";

function getLatestDate(values) {
  return values.reduce((latestDate, value) => {
    if (!value) {
      return latestDate;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return latestDate;
    }

    if (
      !latestDate ||
      date.getTime() > latestDate.getTime()
    ) {
      return date;
    }

    return latestDate;
  }, null);
}

function formatWorkspace(
  workspace,
  stats = {}
) {
  const lastActivity = getLatestDate([
    workspace.updatedAt,
    workspace.createdAt,
    stats.documentLastActivity,
    stats.conversationLastActivity,
  ]);

  return {
    id: workspace._id,
    userId: workspace.userId,
    name: workspace.name,
    description: workspace.description,
    color: workspace.color,
    documentCount: stats.documentCount ?? 0,
    pageCount: stats.pageCount ?? 0,
    lastActivity,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

async function getDocumentStatsByWorkspace(
  workspaceIds
) {
  if (workspaceIds.length === 0) {
    return new Map();
  }

  const stats = await Document.aggregate([
    {
      $match: {
        workspaceId: {
          $in: workspaceIds,
        },
      },
    },
    {
      $group: {
        _id: "$workspaceId",
        documentCount: {
          $sum: 1,
        },
        pageCount: {
          $sum: "$pageCount",
        },
        documentLastActivity: {
          $max: "$updatedAt",
        },
      },
    },
  ]);

  return new Map(
    stats.map((item) => [
      item._id.toString(),
      {
        documentCount: item.documentCount,
        pageCount: item.pageCount ?? 0,
        documentLastActivity:
          item.documentLastActivity,
      },
    ])
  );
}

async function getConversationStatsByWorkspace(
  workspaceIds
) {
  if (workspaceIds.length === 0) {
    return new Map();
  }

  const stats = await Conversation.aggregate([
    {
      $match: {
        workspaceId: {
          $in: workspaceIds,
        },
      },
    },
    {
      $group: {
        _id: "$workspaceId",
        conversationLastActivity: {
          $max: "$lastMessageAt",
        },
      },
    },
  ]);

  return new Map(
    stats.map((item) => [
      item._id.toString(),
      {
        conversationLastActivity:
          item.conversationLastActivity,
      },
    ])
  );
}

async function getWorkspaceStorageUsedBytes(
  workspaceId
) {
  const [storageStats] = await Document.aggregate([
    {
      $match: {
        workspaceId,
      },
    },
    {
      $group: {
        _id: null,
        storageUsedBytes: {
          $sum: "$fileSize",
        },
      },
    },
  ]);

  return storageStats?.storageUsedBytes ?? 0;
}

async function decrementUserStorage({
  userId,
  bytes,
}) {
  await User.updateOne(
    {
      _id: userId,
    },
    {
      $inc: {
        storageUsedBytes: -bytes,
      },
    }
  );

  await User.updateOne(
    {
      _id: userId,
      storageUsedBytes: {
        $lt: 0,
      },
    },
    {
      storageUsedBytes: 0,
    }
  );
}

function getWorkspaceStats(
  statsByWorkspaceId,
  conversationStatsByWorkspaceId,
  workspaceId
) {
  const key = workspaceId.toString();

  return {
    ...(statsByWorkspaceId.get(key) ?? {}),
    ...(conversationStatsByWorkspaceId.get(key) ??
      {}),
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

async function workspaceNameExists({
  userId,
  name,
  workspaceId,
}) {
  const query = {
    userId,
    name,
  };

  if (workspaceId) {
    query._id = {
      $ne: workspaceId,
    };
  }

  const existingWorkspace =
    await Workspace.findOne(query).collation({
      locale: "en",
      strength: 2,
    });

  return Boolean(existingWorkspace);
}

function sendDuplicateNameResponse(res) {
  return res.status(409).json({
    success: false,
    message:
      "A workspace with this name already exists.",
  });
}

export async function createWorkspace(req, res, next) {
  try {
    const {
      name,
      description,
      color,
    } = req.body;

    const duplicateName =
      await workspaceNameExists({
        userId: req.user._id,
        name,
      });

    if (duplicateName) {
      return sendDuplicateNameResponse(res);
    }

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
    if (error.code === 11000) {
      return sendDuplicateNameResponse(res);
    }

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

    const statsByWorkspaceId =
      await getDocumentStatsByWorkspace(
        workspaces.map((workspace) => workspace._id)
      );
    const conversationStatsByWorkspaceId =
      await getConversationStatsByWorkspace(
        workspaces.map((workspace) => workspace._id)
      );

    const formattedWorkspaces = workspaces
      .map((workspace) =>
        formatWorkspace(
          workspace,
          getWorkspaceStats(
            statsByWorkspaceId,
            conversationStatsByWorkspaceId,
            workspace._id
          )
        )
      )
      .sort(
        (firstWorkspace, secondWorkspace) =>
          new Date(
            secondWorkspace.lastActivity ??
              secondWorkspace.updatedAt ??
              0
          ).getTime() -
          new Date(
            firstWorkspace.lastActivity ??
              firstWorkspace.updatedAt ??
              0
          ).getTime()
      );

    return res.status(200).json({
      success: true,
      workspaces: formattedWorkspaces,
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

    const statsByWorkspaceId =
      await getDocumentStatsByWorkspace([
        workspace._id,
      ]);
    const conversationStatsByWorkspaceId =
      await getConversationStatsByWorkspace([
        workspace._id,
      ]);

    return res.status(200).json({
      success: true,
      workspace: formatWorkspace(
        workspace,
        getWorkspaceStats(
          statsByWorkspaceId,
          conversationStatsByWorkspaceId,
          workspace._id
        )
      ),
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

    if (updates.name !== undefined) {
      const duplicateName =
        await workspaceNameExists({
          userId: req.user._id,
          name: updates.name,
          workspaceId: req.params.id,
        });

      if (duplicateName) {
        return sendDuplicateNameResponse(res);
      }
    }

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

    const statsByWorkspaceId =
      await getDocumentStatsByWorkspace([
        workspace._id,
      ]);
    const conversationStatsByWorkspaceId =
      await getConversationStatsByWorkspace([
        workspace._id,
      ]);

    return res.status(200).json({
      success: true,
      message: "Workspace updated successfully.",
      workspace: formatWorkspace(
        workspace,
        getWorkspaceStats(
          statsByWorkspaceId,
          conversationStatsByWorkspaceId,
          workspace._id
        )
      ),
    });
  } catch (error) {
    if (error.code === 11000) {
      return sendDuplicateNameResponse(res);
    }

    next(error);
  }
}

export async function deleteWorkspace(req, res, next) {
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

    const storageUsedBytes =
      await getWorkspaceStorageUsedBytes(
        workspace._id
      );

    const deletedRelatedData =
      await cascadeDeleteWorkspaceData({
        workspaceId: workspace._id,
      });

    await Workspace.deleteOne({
      _id: workspace._id,
      userId: req.user._id,
    });

    try {
      await decrementUserStorage({
        userId: req.user._id,
        bytes: storageUsedBytes,
      });
    } catch (error) {
      console.error(
        "Failed to decrement user storage:",
        error
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Workspace and related data deleted successfully.",
      deleted: {
        workspace: 1,
        ...deletedRelatedData,
      },
    });
  } catch (error) {
    next(error);
  }
}
