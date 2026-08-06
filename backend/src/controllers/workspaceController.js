import Chunk from "../models/Chunk.js";
import Conversation from "../models/Conversation.js";
import Document from "../models/Document.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import { cascadeDeleteWorkspaceData } from "../services/workspaceCascadeService.js";

const analyticsStopWords = new Set([
  "about",
  "also",
  "and",
  "are",
  "can",
  "could",
  "did",
  "doc",
  "docs",
  "document",
  "documents",
  "does",
  "file",
  "files",
  "for",
  "from",
  "give",
  "had",
  "has",
  "have",
  "how",
  "into",
  "its",
  "make",
  "need",
  "please",
  "question",
  "questions",
  "show",
  "summarize",
  "summary",
  "table",
  "tell",
  "that",
  "the",
  "their",
  "this",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "you",
  "your",
]);

function formatWorkspace(
  workspace,
  stats = {}
) {
  return {
    id: workspace._id,
    userId: workspace.userId,
    name: workspace.name,
    description: workspace.description,
    color: workspace.color,
    documentCount: stats.documentCount ?? 0,
    pageCount: stats.pageCount ?? 0,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

function getUtcDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getAnalyticsDateRange(days = 30) {
  const requestedDays = Number(days);
  const normalizedDays = [7, 30, 90].includes(
    requestedDays
  )
    ? requestedDays
    : 30;
  const endDate = new Date();
  const startDate = new Date(
    Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate()
    )
  );

  startDate.setUTCDate(
    startDate.getUTCDate() - normalizedDays + 1
  );

  return {
    days: normalizedDays,
    startDate,
    endDate,
  };
}

function buildDateBuckets({
  days,
  startDate,
  queryCounts,
}) {
  const countsByDate = new Map(
    queryCounts.map((item) => [
      item._id,
      item.count,
    ])
  );

  return Array.from(
    {
      length: days,
    },
    (_item, index) => {
      const date = new Date(startDate);
      date.setUTCDate(date.getUTCDate() + index);
      const dateKey = getUtcDateKey(date);

      return {
        date: dateKey,
        count: countsByDate.get(dateKey) ?? 0,
      };
    }
  );
}

function formatReferencedDocument(item) {
  return {
    documentId: item._id?.documentId ?? "",
    documentName:
      item._id?.documentName || "Unknown document",
    count: item.count,
  };
}

function formatQuestionTopic(item) {
  return {
    topic: item.topic,
    count: item.count,
  };
}

function tokenizeTopicText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .map((word) =>
      word.replace(/[^a-z0-9]+/g, "")
    )
    .filter(Boolean);
}

function getDocumentTopicStopWords(documents = []) {
  const documentStopWords = new Set();

  documents.forEach((document) => {
    tokenizeTopicText(document.originalName).forEach(
      (word) => {
        documentStopWords.add(word);
      }
    );
  });

  return documentStopWords;
}

function normalizeQuestionContent(content) {
  return String(content ?? "")
    .replace(/@\S+/g, " ")
    .replace(/\b\S+\.(pdf|docx|csv|txt)\b/gi, " ")
    .replace(/\b\S*(pdf|docx|csv|txt)\b/gi, " ")
    .replace(/[_-]+/g, " ");
}

function getQuestionTopics({
  messages = [],
  documents = [],
}) {
  const topicCounts = new Map();
  const documentStopWords =
    getDocumentTopicStopWords(documents);

  messages.forEach((message) => {
    tokenizeTopicText(
      normalizeQuestionContent(message.content)
    )
      .filter(
        (word) =>
          word.length >= 3 &&
          !/\d/.test(word) &&
          !analyticsStopWords.has(word) &&
          !documentStopWords.has(word)
      )
      .forEach((word) => {
        topicCounts.set(
          word,
          (topicCounts.get(word) ?? 0) + 1
        );
      });
  });

  return Array.from(
    topicCounts,
    ([topic, count]) => ({
      topic,
      count,
    })
  )
    .sort(
      (first, second) =>
        second.count - first.count ||
        first.topic.localeCompare(second.topic)
    )
    .slice(0, 8);
}

function formatDocumentType(item, totalDocuments) {
  return {
    format: item._id,
    count: item.count,
    percentage:
      totalDocuments > 0
        ? Math.round((item.count / totalDocuments) * 100)
        : 0,
  };
}

async function getUserWorkspaceById({
  workspaceId,
  userId,
}) {
  return Workspace.findOne({
    _id: workspaceId,
    userId,
  });
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
      },
    },
  ]);

  return new Map(
    stats.map((item) => [
      item._id.toString(),
      {
        documentCount: item.documentCount,
        pageCount: item.pageCount ?? 0,
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
  workspaceId
) {
  return (
    statsByWorkspaceId.get(
      workspaceId.toString()
    ) ?? {}
  );
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

    return res.status(200).json({
      success: true,
      workspaces: workspaces.map((workspace) =>
        formatWorkspace(
          workspace,
          getWorkspaceStats(
            statsByWorkspaceId,
            workspace._id
          )
        )
      ),
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

    return res.status(200).json({
      success: true,
      workspace: formatWorkspace(
        workspace,
        getWorkspaceStats(
          statsByWorkspaceId,
          workspace._id
        )
      ),
    });
  } catch (error) {
    next(error);
  }
}

export async function getWorkspaceAnalytics(
  req,
  res,
  next
) {
  try {
    const workspace = await getUserWorkspaceById({
      workspaceId: req.params.id,
      userId: req.user._id,
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found.",
      });
    }

    const {
      days,
      startDate,
      endDate,
    } = getAnalyticsDateRange(req.query.days);
    const conversations = await Conversation.find({
      workspaceId: workspace._id,
    }).select("_id");
    const workspaceDocuments = await Document.find({
      workspaceId: workspace._id,
    }).select("originalName");
    const conversationIds = conversations.map(
      (conversation) => conversation._id
    );
    const messageMatch = {
      conversationId: {
        $in: conversationIds,
      },
      createdAt: {
        $gte: startDate,
      },
    };

    const [
      messageAnalytics = {},
    ] = conversationIds.length
      ? await Message.aggregate([
          {
            $match: messageMatch,
          },
          {
            $facet: {
              queryCounts: [
                {
                  $match: {
                    role: "user",
                  },
                },
                {
                  $group: {
                    _id: {
                      $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$createdAt",
                        timezone: "UTC",
                      },
                    },
                    count: {
                      $sum: 1,
                    },
                  },
                },
                {
                  $sort: {
                    _id: 1,
                  },
                },
              ],
              totalQueries: [
                {
                  $match: {
                    role: "user",
                  },
                },
                {
                  $count: "count",
                },
              ],
              referencedDocuments: [
                {
                  $match: {
                    role: "assistant",
                  },
                },
                {
                  $unwind: "$citations",
                },
                {
                  $match: {
                    "citations.documentId": {
                      $exists: true,
                      $ne: "",
                    },
                  },
                },
                {
                  $group: {
                    _id: {
                      documentId: "$citations.documentId",
                      documentName:
                        "$citations.documentName",
                    },
                    count: {
                      $sum: 1,
                    },
                  },
                },
                {
                  $sort: {
                    count: -1,
                    "_id.documentName": 1,
                  },
                },
                {
                  $limit: 6,
                },
              ],
              questionMessages: [
                {
                  $match: {
                    role: "user",
                  },
                },
                {
                  $project: {
                    _id: 0,
                    content: 1,
                  },
                },
              ],
            },
          },
        ])
      : [
          {
            queryCounts: [],
            totalQueries: [],
            referencedDocuments: [],
            questionMessages: [],
          },
        ];

    const [documentAnalytics = {}] =
      await Document.aggregate([
        {
          $match: {
            workspaceId: workspace._id,
          },
        },
        {
          $facet: {
            typeBreakdown: [
              {
                $group: {
                  _id: "$format",
                  count: {
                    $sum: 1,
                  },
                },
              },
              {
                $sort: {
                  count: -1,
                  _id: 1,
                },
              },
            ],
            totals: [
              {
                $group: {
                  _id: null,
                  documentCount: {
                    $sum: 1,
                  },
                  readyDocumentCount: {
                    $sum: {
                      $cond: [
                        {
                          $eq: [
                            "$status",
                            "ready",
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      ]);

    const [chunkAnalytics = {}] =
      await Chunk.aggregate([
        {
          $match: {
            workspaceId: workspace._id,
          },
        },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  chunkCount: {
                    $sum: 1,
                  },
                  indexedChunkCount: {
                    $sum: {
                      $cond: [
                        {
                          $isArray: "$embedding",
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
            chunkedDocuments: [
              {
                $group: {
                  _id: "$documentId",
                  chunkCount: {
                    $sum: 1,
                  },
                },
              },
              {
                $count: "count",
              },
            ],
          },
        },
      ]);

    const totalDocuments =
      documentAnalytics.totals?.[0]?.documentCount ?? 0;
    const totalQueries =
      messageAnalytics.totalQueries?.[0]?.count ?? 0;
    const referencedDocuments =
      messageAnalytics.referencedDocuments?.map(
        formatReferencedDocument
      ) ?? [];
    const totalCitations =
      referencedDocuments.reduce(
        (sum, item) => sum + item.count,
        0
      );
    const questionTopics = getQuestionTopics({
      messages: messageAnalytics.questionMessages,
      documents: workspaceDocuments,
    });

    return res.status(200).json({
      success: true,
      analytics: {
        range: {
          days,
          startDate,
          endDate,
        },
        summary: {
          totalQueries,
          referencedDocumentCount:
            referencedDocuments.length,
          totalCitations,
          documentCount: totalDocuments,
          readyDocumentCount:
            documentAnalytics.totals?.[0]
              ?.readyDocumentCount ?? 0,
          chunkCount:
            chunkAnalytics.totals?.[0]?.chunkCount ?? 0,
          indexedChunkCount:
            chunkAnalytics.totals?.[0]
              ?.indexedChunkCount ?? 0,
          chunkedDocumentCount:
            chunkAnalytics.chunkedDocuments?.[0]
              ?.count ?? 0,
        },
        queriesOverTime: buildDateBuckets({
          days,
          startDate,
          queryCounts:
            messageAnalytics.queryCounts ?? [],
        }),
        referencedDocuments,
        questionTopics: questionTopics.map(
          formatQuestionTopic
        ),
        documentTypes:
          documentAnalytics.typeBreakdown?.map(
            (item) =>
              formatDocumentType(item, totalDocuments)
          ) ?? [],
      },
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

    return res.status(200).json({
      success: true,
      message: "Workspace updated successfully.",
      workspace: formatWorkspace(
        workspace,
        getWorkspaceStats(
          statsByWorkspaceId,
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
