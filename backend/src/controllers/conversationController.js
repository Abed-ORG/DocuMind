import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Workspace from "../models/Workspace.js";

const defaultConversationTitle =
  "New Conversation";
const titleStopWords = new Set([
  "about",
  "also",
  "and",
  "can",
  "could",
  "document",
  "documents",
  "file",
  "files",
  "for",
  "from",
  "give",
  "into",
  "its",
  "make",
  "please",
  "show",
  "summarize",
  "summary",
  "table",
  "tell",
  "that",
  "the",
  "this",
  "what",
  "with",
  "you",
]);

function formatDate(value) {
  return value ?? null;
}

function formatConversation(
  conversation,
  stats = {}
) {
  return {
    id: conversation._id,
    workspaceId: conversation.workspaceId,
    title: conversation.title,
    lastMessageAt: formatDate(
      conversation.lastMessageAt
    ),
    messageCount: stats.messageCount ?? 0,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function formatMessage(message) {
  return {
    id: message._id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    citations: message.citations ?? [],
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

async function touchWorkspaceActivity(workspaceId) {
  await Workspace.updateOne(
    {
      _id: workspaceId,
    },
    {
      $currentDate: {
        updatedAt: true,
      },
    }
  );
}

async function findUserWorkspace(req) {
  return Workspace.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
}

async function findConversationInWorkspace(req) {
  return Conversation.findOne({
    _id: req.params.conversationId,
    workspaceId: req.params.id,
  });
}

function sendWorkspaceNotFound(res) {
  return res.status(404).json({
    success: false,
    message: "Workspace not found.",
  });
}

function sendConversationNotFound(res) {
  return res.status(404).json({
    success: false,
    message: "Conversation not found.",
  });
}

function buildConversationTitle(content) {
  const normalizedContent = String(content ?? "")
    .replace(/@([\w .()[\]-]+\.(?:pdf|docx|txt|csv))/gi, "$1")
    .replace(/\b(can|could)\s+u\b/gi, "")
    .replace(/\b(can|could)\s+you\b/gi, "")
    .replace(/\b(tell me about|give me|show me|summarize for me|summarize|please)\b/gi, "")
    .replace(/\b(the|a|an)\s+(table|summary|paragraph)\b/gi, "")
    .replace(/\b(in|as)\s+(a\s+)?(paragraph|table|summary)\b/gi, "")
    .replace(/\b\w+\.(pdf|docx|txt|csv)\b/gi, (match) =>
      match
        .replace(/\.(pdf|docx|txt|csv)$/i, "")
        .replace(/[_-]+/g, " ")
    )
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedContent) {
    return defaultConversationTitle;
  }

  const words = normalizedContent
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => {
      const normalizedWord = word.toLowerCase();

      return (
        normalizedWord.length > 1 &&
        !titleStopWords.has(normalizedWord)
      );
    })
    .slice(0, 5);

  const titleSource =
    words.length > 0
      ? words.join(" ")
      : normalizedContent;
  const title = titleSource
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    )
    .trim();

  if (title.length <= 56) {
    return title;
  }

  return `${title.slice(0, 53).trim()}...`;
}

function buildConversationUpdates({
  conversation,
  message,
  previousMessageCount,
}) {
  const updates = {
    lastMessageAt:
      message.createdAt ?? new Date(),
  };

  if (
    previousMessageCount === 0 &&
    message.role === "user" &&
    conversation.title === defaultConversationTitle
  ) {
    updates.title = buildConversationTitle(
      message.content
    );
  }

  return updates;
}

async function getMessageCountsByConversation(
  conversationIds
) {
  if (conversationIds.length === 0) {
    return new Map();
  }

  const counts = await Message.aggregate([
    {
      $match: {
        conversationId: {
          $in: conversationIds,
        },
      },
    },
    {
      $group: {
        _id: "$conversationId",
        messageCount: {
          $sum: 1,
        },
      },
    },
  ]);

  return new Map(
    counts.map((item) => [
      item._id.toString(),
      {
        messageCount: item.messageCount,
      },
    ])
  );
}

export async function createConversation(
  req,
  res,
  next
) {
  try {
    const workspace = await findUserWorkspace(req);

    if (!workspace) {
      return sendWorkspaceNotFound(res);
    }

    const conversation =
      await Conversation.create({
        workspaceId: workspace._id,
        ...(req.body.title && {
          title: req.body.title,
        }),
      });
    await touchWorkspaceActivity(workspace._id);

    return res.status(201).json({
      success: true,
      message:
        "Conversation created successfully.",
      conversation:
        formatConversation(conversation),
    });
  } catch (error) {
    next(error);
  }
}

export async function getConversations(
  req,
  res,
  next
) {
  try {
    const workspace = await findUserWorkspace(req);

    if (!workspace) {
      return sendWorkspaceNotFound(res);
    }

    const conversations = await Conversation.find({
      workspaceId: workspace._id,
    }).sort({
      lastMessageAt: -1,
      updatedAt: -1,
    });
    const countsByConversationId =
      await getMessageCountsByConversation(
        conversations.map(
          (conversation) => conversation._id
        )
      );

    return res.status(200).json({
      success: true,
      conversations: conversations.map(
        (conversation) =>
          formatConversation(
            conversation,
            countsByConversationId.get(
              conversation._id.toString()
            )
          )
      ),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteConversation(
  req,
  res,
  next
) {
  try {
    const workspace = await findUserWorkspace(req);

    if (!workspace) {
      return sendWorkspaceNotFound(res);
    }

    const conversation =
      await findConversationInWorkspace(req);

    if (!conversation) {
      return sendConversationNotFound(res);
    }

    const deletedMessages =
      await Message.deleteMany({
        conversationId: conversation._id,
      });

    await Conversation.deleteOne({
      _id: conversation._id,
    });
    await touchWorkspaceActivity(workspace._id);

    return res.status(200).json({
      success: true,
      message:
        "Conversation deleted successfully.",
      deleted: {
        conversation: 1,
        messages:
          deletedMessages.deletedCount ?? 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateConversation(
  req,
  res,
  next
) {
  try {
    const workspace = await findUserWorkspace(req);

    if (!workspace) {
      return sendWorkspaceNotFound(res);
    }

    const conversation =
      await findConversationInWorkspace(req);

    if (!conversation) {
      return sendConversationNotFound(res);
    }

    conversation.title = req.body.title;
    await conversation.save();
    await touchWorkspaceActivity(workspace._id);

    const messageCount =
      await Message.countDocuments({
        conversationId: conversation._id,
      });

    return res.status(200).json({
      success: true,
      message:
        "Conversation updated successfully.",
      conversation: formatConversation(
        conversation,
        {
          messageCount,
        }
      ),
    });
  } catch (error) {
    next(error);
  }
}

export async function getConversationMessages(
  req,
  res,
  next
) {
  try {
    const workspace = await findUserWorkspace(req);

    if (!workspace) {
      return sendWorkspaceNotFound(res);
    }

    const conversation =
      await findConversationInWorkspace(req);

    if (!conversation) {
      return sendConversationNotFound(res);
    }

    const messages = await Message.find({
      conversationId: conversation._id,
    }).sort({
      createdAt: 1,
      _id: 1,
    });

    return res.status(200).json({
      success: true,
      conversation:
        formatConversation(conversation, {
          messageCount: messages.length,
        }),
      messages: messages.map(formatMessage),
    });
  } catch (error) {
    next(error);
  }
}

export async function createConversationMessage(
  req,
  res,
  next
) {
  try {
    const workspace = await findUserWorkspace(req);

    if (!workspace) {
      return sendWorkspaceNotFound(res);
    }

    const conversation =
      await findConversationInWorkspace(req);

    if (!conversation) {
      return sendConversationNotFound(res);
    }

    const previousMessageCount =
      await Message.countDocuments({
        conversationId: conversation._id,
      });
    const message = await Message.create({
      conversationId: conversation._id,
      role: req.body.role,
      content: req.body.content,
      citations: req.body.citations ?? [],
    });
    const updates = buildConversationUpdates({
      conversation,
      message,
      previousMessageCount,
    });

    await Conversation.updateOne(
      {
        _id: conversation._id,
      },
      updates
    );
    await touchWorkspaceActivity(workspace._id);

    const updatedConversation =
      await Conversation.findById(
        conversation._id
      );

    return res.status(201).json({
      success: true,
      message: "Message created successfully.",
      conversation: formatConversation(
        updatedConversation,
        {
          messageCount:
            previousMessageCount + 1,
        }
      ),
      chatMessage: formatMessage(message),
    });
  } catch (error) {
    next(error);
  }
}
