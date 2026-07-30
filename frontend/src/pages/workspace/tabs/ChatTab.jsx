import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useOutletContext } from "react-router";
import {
  AlertTriangle,
  Bot,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "../../../context/AuthContext";
import {
  answerWorkspaceQuestion,
  createConversation,
  createConversationMessage,
  deleteConversation,
  getConversationMessages,
  getConversations,
  updateConversation,
} from "../../../services/api";

function formatConversationTimestamp(value) {
  if (!value) {
    return "No messages";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMessageTimestamp(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
    .format(date)
    .replace(/\s/g, "")
    .toLowerCase();
}

function getCitationTitle(citation) {
  const parts = [];

  if (citation.documentName) {
    parts.push(citation.documentName);
  }

  if (citation.pageNumber) {
    parts.push(`p. ${citation.pageNumber}`);
  }

  if (citation.sectionHeader) {
    parts.push(citation.sectionHeader);
  }

  return parts.join(", ") || `Source ${citation.label}`;
}

function getShortDocumentName(documentName) {
  const normalizedName = String(documentName ?? "")
    .split(/[\\/]/)
    .filter(Boolean)
    .at(-1);

  if (!normalizedName) {
    return "";
  }

  if (normalizedName.length <= 34) {
    return normalizedName;
  }

  const extensionMatch = normalizedName.match(
    /(\.[a-z0-9]+)$/i
  );
  const extension = extensionMatch?.[1] ?? "";
  const baseName = extension
    ? normalizedName.slice(0, -extension.length)
    : normalizedName;

  return `${baseName.slice(0, 24).trim()}...${extension}`;
}

function getCitationChipLabel(citation) {
  const sourceLabel =
    getShortDocumentName(citation.documentName) ||
    `Source ${citation.label}`;
  const pageLabel = citation.pageNumber
    ? `p. ${citation.pageNumber}`
    : "page unknown";

  return `${sourceLabel}, ${pageLabel}`;
}

function escapeRegExp(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function getAnswerCitationContext(
  answerText,
  citation
) {
  const label =
    citation.citationNumber ?? citation.label;
  const citationPattern = new RegExp(
    `\\[${escapeRegExp(label)}\\]`
  );
  const sentences = String(answerText ?? "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return (
    sentences.find((sentence) =>
      citationPattern.test(sentence)
    ) ?? ""
  );
}

const highlightStopWords = new Set([
  "about",
  "across",
  "after",
  "also",
  "and",
  "are",
  "based",
  "been",
  "before",
  "between",
  "can",
  "could",
  "does",
  "for",
  "from",
  "has",
  "have",
  "how",
  "including",
  "into",
  "its",
  "may",
  "not",
  "our",
  "the",
  "their",
  "then",
  "there",
  "these",
  "this",
  "that",
  "those",
  "through",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "you",
  "your",
]);

function getSignificantTerms(value) {
  return new Set(
    String(value ?? "")
      .toLowerCase()
      .match(/[a-z0-9]{3,}/g)
      ?.filter(
        (word) => !highlightStopWords.has(word)
      ) ?? []
  );
}

function splitSourceText(text) {
  const sourceText = String(text ?? "");

  return (
    sourceText.match(
      /[^.!?\n]+(?:[.!?]+|\n+|$)|\s+/g
    ) ?? [sourceText]
  ).filter((part) => part.length > 0);
}

function getHighlightedSourceParts(citation) {
  const sourceText = citation.text || "";
  const answerContext = getAnswerCitationContext(
    citation.answerText,
    citation
  );
  const contextTerms =
    getSignificantTerms(answerContext);
  const parts = splitSourceText(sourceText);

  if (!sourceText || parts.length === 0) {
    return {
      answerContext,
      parts: [],
    };
  }

  let bestPartIndex = -1;
  let bestScore = 0;

  parts.forEach((part, index) => {
    const partTerms = getSignificantTerms(part);
    let score = 0;

    contextTerms.forEach((term) => {
      if (partTerms.has(term)) {
        score += 1;
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestPartIndex = index;
    }
  });

  return {
    answerContext,
    parts: parts.map((part, index) => ({
      text: part,
      isHighlighted:
        index === bestPartIndex && bestScore > 0,
    })),
  };
}

function mapMessage(message) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    citations: message.citations ?? [],
    createdAt: message.createdAt,
  };
}

function getHistory(messages) {
  return messages
    .slice(-6)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

function normalizeMarkdownMessage(content) {
  return String(content ?? "")
    .replace(
      /(^|\s)\*\s+(?=\*\*|\S)/g,
      "$1\n* "
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderInlineMarkdown(text, keyPrefix) {
  return String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((part) => part.length > 0)
    .map((part, index) => {
      const boldMatch = part.match(
        /^\*\*([^*]+)\*\*$/
      );

      if (boldMatch) {
        return (
          <strong key={`${keyPrefix}-${index}`}>
            {boldMatch[1]}
          </strong>
        );
      }

      return part;
    });
}

function renderMarkdownMessage(content) {
  const lines = normalizeMarkdownMessage(content)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks = [];
  let listItems = [];

  function flushList() {
    if (listItems.length === 0) {
      return;
    }

    const listIndex = blocks.length;

    blocks.push(
      <ul key={`list-${listIndex}`}>
        {listItems.map((item, itemIndex) => (
          <li key={`list-${listIndex}-${itemIndex}`}>
            {renderInlineMarkdown(
              item,
              `li-${listIndex}-${itemIndex}`
            )}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  }

  lines.forEach((line) => {
    const listMatch = line.match(/^[-*]\s+(.+)$/);

    if (listMatch) {
      listItems.push(listMatch[1]);
      return;
    }

    flushList();

    const paragraphIndex = blocks.length;

    blocks.push(
      <p key={`paragraph-${paragraphIndex}`}>
        {renderInlineMarkdown(
          line,
          `p-${paragraphIndex}`
        )}
      </p>
    );
  });

  flushList();

  return blocks;
}

function ChatTab() {
  const { workspace } = useOutletContext();
  const { token } = useAuth();
  const workspaceId = workspace?.id;

  const [conversations, setConversations] =
    useState([]);
  const [activeConversationId, setActiveConversationId] =
    useState(null);
  const [messagesByConversation, setMessagesByConversation] =
    useState({});
  const [conversationSearch, setConversationSearch] =
    useState("");
  const [messageInput, setMessageInput] =
    useState("");
  const [isLoadingConversations, setIsLoadingConversations] =
    useState(true);
  const [isLoadingMessages, setIsLoadingMessages] =
    useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState("");
  const [activeCitation, setActiveCitation] =
    useState(null);
  const [conversationPendingDelete, setConversationPendingDelete] =
    useState(null);
  const [editingConversationId, setEditingConversationId] =
    useState(null);
  const [conversationTitleDraft, setConversationTitleDraft] =
    useState("");
  const [isSavingConversationTitle, setIsSavingConversationTitle] =
    useState(false);
  const [animatedMessageId, setAnimatedMessageId] =
    useState(null);

  const messageEndRef = useRef(null);
  const isAwaitingResponseRef = useRef(false);
  const animationTimeoutRef = useRef(null);
  const shouldSkipRenameSaveRef = useRef(false);
  const isSavingConversationTitleRef =
    useRef(false);

  const activeMessages =
    messagesByConversation[activeConversationId] ?? [];
  const activeCitationSource = useMemo(
    () =>
      activeCitation
        ? getHighlightedSourceParts(activeCitation)
        : {
            answerContext: "",
            parts: [],
          },
    [activeCitation]
  );

  const filteredConversations = useMemo(
    () =>
      conversations.filter((conversation) =>
        conversation.title
          .toLowerCase()
          .includes(
            conversationSearch.toLowerCase()
          )
      ),
    [conversations, conversationSearch]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadConversations() {
      if (!token || !workspaceId) {
        setIsLoadingConversations(false);
        return;
      }

      setIsLoadingConversations(true);
      setChatError("");

      try {
        const response = await getConversations(
          workspaceId,
          token
        );
        const nextConversations =
          response.conversations ?? [];

        if (isMounted) {
          setConversations(nextConversations);
          setActiveConversationId((current) => {
            if (
              current &&
              nextConversations.some(
                (conversation) =>
                  conversation.id === current
              )
            ) {
              return current;
            }

            return nextConversations[0]?.id ?? null;
          });
        }
      } catch (error) {
        if (isMounted) {
          setChatError(
            error.message ||
              "Unable to load conversations."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingConversations(false);
        }
      }
    }

    loadConversations();

    return () => {
      isMounted = false;
    };
  }, [token, workspaceId]);

  useEffect(() => {
    let isMounted = true;

    async function loadMessages() {
      if (
        !token ||
        !workspaceId ||
        !activeConversationId ||
        messagesByConversation[activeConversationId]
      ) {
        return;
      }

      setIsLoadingMessages(true);
      setChatError("");

      try {
        const response =
          await getConversationMessages(
            workspaceId,
            activeConversationId,
            token
          );

        if (isMounted) {
          setMessagesByConversation(
            (current) => ({
              ...current,
              [activeConversationId]:
                response.messages.map(mapMessage),
            })
          );
        }
      } catch (error) {
        if (isMounted) {
          setChatError(
            error.message ||
              "Unable to load messages."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingMessages(false);
        }
      }
    }

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [
    activeConversationId,
    messagesByConversation,
    token,
    workspaceId,
  ]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [
    activeMessages.length,
    isTyping,
    activeConversationId,
  ]);

  useEffect(
    () => () => {
      if (animationTimeoutRef.current) {
        window.clearTimeout(
          animationTimeoutRef.current
        );
      }
    },
    []
  );

  function updateConversationFromResponse(
    conversation
  ) {
    setConversations((current) => {
      const withoutConversation = current.filter(
        (item) => item.id !== conversation.id
      );

      return [
        conversation,
        ...withoutConversation,
      ];
    });
    setActiveConversationId(conversation.id);
  }

  async function handleCreateConversation() {
    if (!token || !workspaceId) {
      return;
    }

    setChatError("");

    try {
      const response = await createConversation(
        workspaceId,
        {},
        token
      );

      updateConversationFromResponse(
        response.conversation
      );
      setMessagesByConversation((current) => ({
        ...current,
        [response.conversation.id]: [],
      }));
      setActiveCitation(null);
    } catch (error) {
      setChatError(
        error.message ||
          "Unable to create conversation."
      );
    }
  }

  async function ensureActiveConversation() {
    if (activeConversationId) {
      return activeConversationId;
    }

    const response = await createConversation(
      workspaceId,
      {},
      token
    );

    updateConversationFromResponse(
      response.conversation
    );
    setMessagesByConversation((current) => ({
      ...current,
      [response.conversation.id]: [],
    }));

    return response.conversation.id;
  }

  async function handleDeleteConversation(
    conversationId
  ) {
    if (!token || !workspaceId || isTyping) {
      return;
    }

    setChatError("");

    try {
      await deleteConversation(
        workspaceId,
        conversationId,
        token
      );

      const nextConversations =
        conversations.filter(
          (conversation) =>
            conversation.id !== conversationId
        );

      setConversations((current) => {
        return current.filter(
          (conversation) =>
            conversation.id !== conversationId
        );
      });
      setActiveConversationId((currentId) =>
        currentId === conversationId
          ? nextConversations[0]?.id ?? null
          : currentId
      );
      setMessagesByConversation((current) => {
        const nextMessages = {
          ...current,
        };

        delete nextMessages[conversationId];

        return nextMessages;
      });
      setActiveCitation(null);
      setConversationPendingDelete(null);
    } catch (error) {
      setChatError(
        error.message ||
          "Unable to delete conversation."
      );
    }
  }

  function startRenamingConversation(
    conversation
  ) {
    if (isTyping || isSavingConversationTitle) {
      return;
    }

    shouldSkipRenameSaveRef.current = false;
    setEditingConversationId(conversation.id);
    setConversationTitleDraft(conversation.title);
  }

  function cancelRenameConversation() {
    setEditingConversationId(null);
    setConversationTitleDraft("");
  }

  async function saveConversationTitle(
    conversation
  ) {
    if (
      !token ||
      !workspaceId ||
      isSavingConversationTitleRef.current
    ) {
      return;
    }

    const title = conversationTitleDraft.trim();

    if (!title) {
      cancelRenameConversation();
      return;
    }

    if (title === conversation.title) {
      cancelRenameConversation();
      return;
    }

    isSavingConversationTitleRef.current = true;
    setIsSavingConversationTitle(true);
    setChatError("");

    try {
      const response = await updateConversation(
        workspaceId,
        conversation.id,
        {
          title,
        },
        token
      );

      setConversations((current) =>
        current.map((item) =>
          item.id === response.conversation.id
            ? response.conversation
            : item
        )
      );
      cancelRenameConversation();
    } catch (error) {
      setChatError(
        error.message ||
          "Unable to rename conversation."
      );
    } finally {
      isSavingConversationTitleRef.current = false;
      setIsSavingConversationTitle(false);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();

    if (
      isAwaitingResponseRef.current ||
      !token ||
      !workspaceId
    ) {
      return;
    }

    const text = messageInput.trim();

    if (!text || isTyping) {
      return;
    }

    isAwaitingResponseRef.current = true;
    setChatError("");
    setMessageInput("");
    setIsTyping(true);

    try {
      const conversationId =
        await ensureActiveConversation();
      const existingMessages =
        messagesByConversation[conversationId] ?? [];
      const userResponse =
        await createConversationMessage(
          workspaceId,
          conversationId,
          {
            role: "user",
            content: text,
          },
          token
        );
      const userMessage = mapMessage(
        userResponse.chatMessage
      );

      updateConversationFromResponse(
        userResponse.conversation
      );
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: [
          ...(current[conversationId] ?? []),
          userMessage,
        ],
      }));
      setAnimatedMessageId(userMessage.id);

      if (animationTimeoutRef.current) {
        window.clearTimeout(
          animationTimeoutRef.current
        );
      }

      animationTimeoutRef.current =
        window.setTimeout(() => {
          setAnimatedMessageId(null);
        }, 480);

      const answerResponse =
        await answerWorkspaceQuestion(
          workspaceId,
          {
            query: text,
            limit: 5,
            conversationHistory:
              getHistory(existingMessages),
          },
          token
        );
      const assistantResponse =
        await createConversationMessage(
          workspaceId,
          conversationId,
          {
            role: "assistant",
            content: answerResponse.answer,
            citations:
              answerResponse.citations ?? [],
          },
          token
        );

      updateConversationFromResponse(
        assistantResponse.conversation
      );
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: [
          ...(current[conversationId] ?? []),
          mapMessage(
            assistantResponse.chatMessage
          ),
        ],
      }));
    } catch (error) {
      setChatError(
        error.message ||
          "Unable to send this message."
      );
      setMessageInput(text);
    } finally {
      isAwaitingResponseRef.current = false;
      setIsTyping(false);
    }
  }

  return (
    <div className="chat-layout">
      <aside className="conversation-list">
        <div className="conversation-toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              type="search"
              value={conversationSearch}
              onChange={(event) =>
                setConversationSearch(
                  event.target.value
                )
              }
              placeholder="Search conversations"
            />
          </label>

          <button
            className="primary-action"
            type="button"
            onClick={handleCreateConversation}
            disabled={
              isLoadingConversations || isTyping
            }
          >
            New Conversation
          </button>
        </div>

        <div className="conversation-items">
          {isLoadingConversations ? (
            <p className="chat-sidebar-state">
              Loading conversations
            </p>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map(
              (conversation) => (
                <div
                  key={conversation.id}
                  className={
                    conversation.id ===
                    activeConversationId
                      ? "conversation-item is-active"
                      : "conversation-item"
                  }
                >
                  {editingConversationId ===
                  conversation.id ? (
                    <form
                      className="conversation-title-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        saveConversationTitle(
                          conversation
                        );
                      }}
                    >
                      <input
                        className="conversation-title-input"
                        aria-label="Conversation title"
                        value={conversationTitleDraft}
                        onChange={(event) =>
                          setConversationTitleDraft(
                            event.target.value
                          )
                        }
                        onBlur={() => {
                          if (
                            shouldSkipRenameSaveRef.current
                          ) {
                            shouldSkipRenameSaveRef.current = false;
                            return;
                          }

                          saveConversationTitle(
                            conversation
                          );
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.preventDefault();
                            shouldSkipRenameSaveRef.current = true;
                            cancelRenameConversation();
                          }
                        }}
                        autoFocus
                        disabled={
                          isSavingConversationTitle
                        }
                      />
                      <span>
                        {formatConversationTimestamp(
                          conversation.lastMessageAt
                        )}
                      </span>
                    </form>
                  ) : (
                    <button
                      className="conversation-select-button"
                      type="button"
                      onClick={() => {
                        setActiveConversationId(
                          conversation.id
                        );
                        setActiveCitation(null);
                      }}
                      onDoubleClick={() =>
                        startRenamingConversation(
                          conversation
                        )
                      }
                      title="Double-click to rename"
                    >
                      <strong>
                        {conversation.title}
                      </strong>
                      <span>
                        {formatConversationTimestamp(
                          conversation.lastMessageAt
                        )}
                      </span>
                    </button>
                  )}
                  <button
                    className="conversation-delete-button"
                    type="button"
                    aria-label="Delete conversation"
                    title="Delete conversation"
                    disabled={isTyping}
                    onClick={() => {
                      setConversationPendingDelete(
                        conversation
                      );
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            )
          ) : (
            <p className="chat-sidebar-state">
              No conversations
            </p>
          )}
        </div>
      </aside>

      <section className="chat-main">
        <div className="message-stream">
          {chatError && (
            <div className="chat-error" role="alert">
              {chatError}
            </div>
          )}

          {isLoadingMessages ? (
            <div className="chat-empty-state">
              <Bot size={36} />
              <h2>Loading messages</h2>
            </div>
          ) : activeMessages.length ? (
            activeMessages.map((message) => (
              <article
                key={message.id}
                className={`message-bubble ${message.role}${
                  message.id === animatedMessageId
                    ? " is-entering"
                    : ""
                }`}
              >
                {message.role === "user" ? (
                  <p>{message.content}</p>
                ) : (
                  <div className="message-content">
                    {renderMarkdownMessage(
                      message.content
                    )}
                  </div>
                )}
                {message.role === "user" && (
                  <time
                    className="message-timestamp"
                    dateTime={message.createdAt}
                  >
                    {formatMessageTimestamp(
                      message.createdAt
                    )}
                  </time>
                )}
                {message.citations?.length > 0 && (
                  <div className="citation-chip-row">
                    {message.citations.map(
                      (citation, index) => (
                        <button
                          key={`${message.id}-${citation.label}-${index}`}
                          type="button"
                          onClick={() =>
                            setActiveCitation({
                              ...citation,
                              answerText:
                                message.content,
                            })
                          }
                          title={getCitationTitle(
                            citation
                          )}
                        >
                          <span>
                            [{citation.label}]
                          </span>
                          {getCitationChipLabel(
                            citation
                          )}
                        </button>
                      )
                    )}
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="chat-empty-state">
              <Bot size={36} />
              <h2>Ask a question about your documents</h2>
              <p>
                Start with a source-backed question, then inspect any
                citation chip in the response.
              </p>
            </div>
          )}

          {isTyping && (
            <div
              className="typing-indicator"
              aria-label="AI is typing"
            >
              <span />
              <span />
              <span />
            </div>
          )}

          <div ref={messageEndRef} />
        </div>

        {activeCitation && (
          <aside className="citation-popover">
            <header>
              <div>
                <strong>
                  {getCitationChipLabel(
                    activeCitation
                  )}
                </strong>
                {activeCitation.sectionHeader && (
                  <span>
                    {activeCitation.sectionHeader}
                  </span>
                )}
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Close citation"
                onClick={() =>
                  setActiveCitation(null)
                }
              >
                <X size={16} />
              </button>
            </header>
            {activeCitationSource.answerContext && (
              <p className="citation-answer-context">
                {activeCitationSource.answerContext}
              </p>
            )}
            <p className="citation-source-text">
              {activeCitationSource.parts.length > 0
                ? activeCitationSource.parts.map(
                    (part, index) =>
                      part.isHighlighted ? (
                        <mark key={index}>
                          {part.text}
                        </mark>
                      ) : (
                        <span key={index}>
                          {part.text}
                        </span>
                      )
                  )
                : "Source text unavailable."}
            </p>
          </aside>
        )}

        <form
          className="chat-input-bar"
          onSubmit={sendMessage}
        >
          <input
            value={messageInput}
            onChange={(event) =>
              setMessageInput(event.target.value)
            }
            disabled={isTyping}
            placeholder={
              isTyping
                ? "Waiting for response"
                : "Ask about your documents"
            }
          />
          <button
            className="primary-action"
            type="submit"
            aria-label="Send message"
            disabled={
              isTyping || !messageInput.trim()
            }
            title="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      </section>

      {conversationPendingDelete && (
        <div
          className="modal-backdrop conversation-dialog-backdrop"
          role="presentation"
        >
          <section
            className="workspace-modal conversation-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-conversation-title"
          >
            <header className="document-action-header">
              <span className="document-dialog-icon is-danger">
                <AlertTriangle size={20} />
              </span>
              <div>
                <h2 id="delete-conversation-title">
                  Delete conversation?
                </h2>
                <p className="document-dialog-copy">
                  This will permanently delete{" "}
                  <strong>
                    {conversationPendingDelete.title}
                  </strong>{" "}
                  and all messages in it.
                </p>
              </div>
              <button
                className="icon-button document-dialog-close"
                type="button"
                aria-label="Close delete confirmation"
                onClick={() =>
                  setConversationPendingDelete(null)
                }
              >
                <X size={16} />
              </button>
            </header>

            <div className="modal-actions">
              <button
                className="secondary-action"
                type="button"
                onClick={() =>
                  setConversationPendingDelete(null)
                }
              >
                Cancel
              </button>
              <button
                className="danger-action"
                type="button"
                disabled={isTyping}
                onClick={() =>
                  handleDeleteConversation(
                    conversationPendingDelete.id
                  )
                }
              >
                Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default ChatTab;
