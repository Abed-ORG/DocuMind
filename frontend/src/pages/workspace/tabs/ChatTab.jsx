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
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "../../../context/AuthContext";
import {
  ChatMessagesSkeleton,
  ConversationListSkeleton,
} from "../../../components/Skeleton";
import {
  answerWorkspaceQuestion,
  createConversation,
  createConversationMessage,
  deleteConversation,
  getDocumentFileBlob,
  getDocumentPreview,
  getDocuments,
  getConversationMessages,
  getConversations,
  updateConversation,
} from "../../../services/api";
import { PreviewPanel } from "../components/documents";
import {
  createCsvPreviewTableFromText,
  getCitationChipLabel,
  getCitationEvidenceText,
  getCitationTitle,
  getDocumentFormatFromName,
} from "../utils/citationUtils";
import { mapApiDocument } from "../utils/workspaceUtils";

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

function getMentionQuery(input) {
  const caretText = String(input ?? "");
  const match = caretText.match(
    /(^|\s)@([^\s@]*)$/
  );

  return match ? match[2].toLowerCase() : null;
}

function getTaggedDocumentIds({
  message,
  selectedDocuments,
  documents,
}) {
  const taggedIds = new Set(
    selectedDocuments.map((document) => document.id)
  );
  const normalizedMessage = String(message ?? "").toLowerCase();

  documents.forEach((document) => {
    if (
      normalizedMessage.includes(
        `@${document.name.toLowerCase()}`
      )
    ) {
      taggedIds.add(document.id);
    }
  });

  return [...taggedIds];
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

function createRetryMessage({
  conversationId,
  content,
  retryQuestion,
  documentIds,
}) {
  return {
    id: `retry-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
    role: "assistant",
    content,
    citations: [],
    createdAt: new Date().toISOString(),
    isRetryableError: true,
    retryQuestion,
    retryDocumentIds: documentIds,
    conversationId,
  };
}

function getAnswerFailureMessage(error) {
  if (error?.code === "INCOMPLETE_AI_RESPONSE") {
    return (
      error.message ||
      "The AI response was incomplete. Please retry."
    );
  }

  if (error?.status === 429) {
    return "The AI provider is rate-limited right now. Please retry shortly.";
  }

  if (error?.retryable) {
    return (
      error.message ||
      "The AI could not complete the response. Please retry."
    );
  }

  return (
    error?.message ||
    "The AI could not complete the response. Please retry."
  );
}

function getHistory(messages) {
  return messages
    .slice(-6)
    .map((message) => ({
      role: message.role,
      content: message.content,
      citations: message.citations ?? [],
    }));
}

function normalizeMarkdownMessage(content) {
  return String(content ?? "")
    .replace(/\r\n/g, "\n")
    .replace(
      /(^|\s)\*\s+(?=\*\*|\S)/g,
      "$1\n* "
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderInlineMarkdown(text, keyPrefix) {
  return String(text ?? "")
    .split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g)
    .filter((part) => part.length > 0)
    .map((part, index) => {
      const boldMatch = part.match(
        /^\*\*([^*]+)\*\*$/
      );
      const italicMatch = part.match(
        /^\*([^*\n]+)\*$/
      );
      const codeMatch = part.match(/^`([^`]+)`$/);

      if (boldMatch) {
        return (
          <strong key={`${keyPrefix}-${index}`}>
            {boldMatch[1]}
          </strong>
        );
      }

      if (italicMatch) {
        return (
          <span key={`${keyPrefix}-${index}`}>
            {italicMatch[1]}
          </span>
        );
      }

      if (codeMatch) {
        return (
          <code key={`${keyPrefix}-${index}`}>
            {codeMatch[1]}
          </code>
        );
      }

      return part;
    });
}

function isMarkdownTableSeparator(line) {
  const cells = line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

  return (
    cells.length > 1 &&
    cells.every((cell) =>
      /^:?-{3,}:?$/.test(cell)
    )
  );
}

function isMarkdownTableRow(line) {
  return (
    line.includes("|") &&
    line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|").length > 1
  );
}

function parseMarkdownTableRow(line) {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderMarkdownTable({
  header,
  rows,
  key,
}) {
  return (
    <div className="message-table-scroll" key={key}>
      <table className="message-markdown-table">
        <thead>
          <tr>
            {header.map((cell, index) => (
              <th key={`${key}-head-${index}`}>
                {renderInlineMarkdown(
                  cell,
                  `${key}-head-${index}`
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${key}-row-${rowIndex}`}>
              {header.map((_, cellIndex) => (
                <td
                  key={`${key}-cell-${rowIndex}-${cellIndex}`}
                >
                  {renderInlineMarkdown(
                    row[cellIndex] ?? "",
                    `${key}-cell-${rowIndex}-${cellIndex}`
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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

  for (
    let lineIndex = 0;
    lineIndex < lines.length;
    lineIndex += 1
  ) {
    const line = lines[lineIndex];

    if (/^---+$/.test(line)) {
      flushList();
      blocks.push(
        <hr key={`rule-${blocks.length}`} />
      );
      continue;
    }

    const headingMatch = line.match(
      /^#{1,6}\s+(.+)$/
    );

    if (headingMatch) {
      flushList();
      const headingIndex = blocks.length;

      blocks.push(
        <h3 key={`heading-${headingIndex}`}>
          {renderInlineMarkdown(
            headingMatch[1],
            `heading-${headingIndex}`
          )}
        </h3>
      );
      continue;
    }

    if (
      isMarkdownTableRow(line) &&
      isMarkdownTableSeparator(
        lines[lineIndex + 1] ?? ""
      )
    ) {
      flushList();

      const header = parseMarkdownTableRow(line);
      const rows = [];
      let nextIndex = lineIndex + 2;

      while (
        nextIndex < lines.length &&
        isMarkdownTableRow(lines[nextIndex])
      ) {
        rows.push(
          parseMarkdownTableRow(lines[nextIndex])
        );
        nextIndex += 1;
      }

      blocks.push(
        renderMarkdownTable({
          header,
          rows,
          key: `table-${blocks.length}`,
        })
      );
      lineIndex = nextIndex - 1;
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/);

    if (listMatch) {
      listItems.push(listMatch[1]);
      continue;
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
  }

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
  const [documents, setDocuments] = useState([]);
  const [selectedMentionDocuments, setSelectedMentionDocuments] =
    useState([]);
  const [isLoadingConversations, setIsLoadingConversations] =
    useState(true);
  const [isLoadingMessages, setIsLoadingMessages] =
    useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState("");
  const [activeCitation, setActiveCitation] =
    useState(null);
  const [citationPreviewState, setCitationPreviewState] =
    useState({
      type: "text",
      isLoading: false,
      error: "",
      pages: [],
      table: null,
      html: "",
      fileUrl: "",
    });
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
  const messageInputRef = useRef(null);
  const isAwaitingResponseRef = useRef(false);
  const animationTimeoutRef = useRef(null);
  const shouldSkipRenameSaveRef = useRef(false);
  const isSavingConversationTitleRef =
    useRef(false);

  const activeMessages =
    messagesByConversation[activeConversationId] ?? [];
  const mentionQuery = getMentionQuery(messageInput);
  const isMentionPickerOpen =
    mentionQuery !== null && !isTyping;
  const mentionOptions = useMemo(
    () =>
      documents
        .filter(
          (document) =>
            !selectedMentionDocuments.some(
              (selectedDocument) =>
                selectedDocument.id === document.id
            )
        )
        .filter((document) =>
          document.name
            .toLowerCase()
            .includes(mentionQuery ?? "")
        )
        .slice(0, 12),
    [
      documents,
      mentionQuery,
      selectedMentionDocuments,
    ]
  );
  const activeCitationDocument = useMemo(() => {
    if (!activeCitation) {
      return null;
    }

    return (
      documents.find(
        (document) =>
          document.id === activeCitation.documentId
      ) ?? {
        id: activeCitation.documentId,
        name:
          activeCitation.documentName ??
          "Cited document",
        format: getDocumentFormatFromName(
          activeCitation.documentName
        ),
        pages: activeCitation.pageNumber ?? 0,
        size: "",
        uploadedAt: "",
        status: "ready",
      }
    );
  }, [activeCitation, documents]);

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

    async function loadDocuments() {
      if (!token || !workspaceId) {
        setDocuments([]);
        return;
      }

      try {
        const response = await getDocuments(
          workspaceId,
          token
        );

        if (isMounted) {
          setDocuments(
            (response.documents ?? []).map(
              mapApiDocument
            )
          );
        }
      } catch {
        if (isMounted) {
          setDocuments([]);
        }
      }
    }

    loadDocuments();

    return () => {
      isMounted = false;
    };
  }, [token, workspaceId]);

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
    let isActive = true;
    let fileUrl = "";

    async function loadCitationPreview() {
      if (
        !activeCitation?.documentId ||
        !workspaceId ||
        !token
      ) {
        setCitationPreviewState({
          type: "text",
          isLoading: false,
          error: "",
          pages: [],
          table: null,
          html: "",
          fileUrl: "",
        });
        return;
      }

      setCitationPreviewState({
        type: "text",
        isLoading: true,
        error: "",
        pages: [],
        table: null,
        html: "",
        fileUrl: "",
      });

      try {
        const response = await getDocumentPreview(
          workspaceId,
          activeCitation.documentId,
          token
        );
        const previewType =
          response.preview?.type ?? "text";
        let previewTable =
          response.preview?.table ?? null;

        if (previewType === "file") {
          fileUrl = URL.createObjectURL(
            await getDocumentFileBlob(
              workspaceId,
              activeCitation.documentId,
              token
            )
          );
        } else if (previewType === "table") {
          const csvBlob = await getDocumentFileBlob(
            workspaceId,
            activeCitation.documentId,
            token
          );
          const csvText = await csvBlob.text();

          previewTable = createCsvPreviewTableFromText({
            csvText,
            citationText:
              getCitationEvidenceText(activeCitation),
          });
        }

        if (isActive) {
          setCitationPreviewState({
            type: previewType,
            isLoading: false,
            error: "",
            pages: Array.isArray(
              response.preview?.pages
            )
              ? response.preview.pages
              : [],
            table: previewTable,
            html: response.preview?.html ?? "",
            fileUrl,
          });
        } else if (fileUrl) {
          URL.revokeObjectURL(fileUrl);
        }
      } catch (error) {
        if (isActive) {
          setCitationPreviewState({
            type: "text",
            isLoading: false,
            error:
              error.message ||
              "Unable to load citation preview.",
            pages: [],
            table: null,
            html: "",
            fileUrl: "",
          });
        }
      }
    }

    loadCitationPreview();

    return () => {
      isActive = false;

      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [
    activeCitation?.documentId,
    activeCitation?.label,
    activeCitation?.pageNumber,
    activeCitation?.text,
    activeCitation?.answerText,
    activeCitation,
    workspaceId,
    token,
  ]);

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

  useEffect(() => {
    const input = messageInputRef.current;

    if (!input) {
      return;
    }

    input.style.height = "auto";
    input.style.height = `${Math.min(
      input.scrollHeight,
      132
    )}px`;
  }, [messageInput]);

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
      setMessageInput("");
      setSelectedMentionDocuments([]);
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

  function selectMentionDocument(document) {
    setSelectedMentionDocuments((current) => {
      if (
        current.some(
          (selectedDocument) =>
            selectedDocument.id === document.id
        )
      ) {
        return current;
      }

      return [...current, document];
    });
    setMessageInput((current) =>
      current.replace(
        /(^|\s)@([^\s@]*)$/,
        `$1@${document.name} `
      )
    );
    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  }

  function removeMentionDocument(documentId) {
    const document = selectedMentionDocuments.find(
      (selectedDocument) =>
        selectedDocument.id === documentId
    );

    setSelectedMentionDocuments((current) =>
      current.filter(
        (document) => document.id !== documentId
      )
    );

    if (document?.name) {
      setMessageInput((current) =>
        current
          .replace(`@${document.name}`, "")
          .replace(/\s{2,}/g, " ")
          .trimStart()
      );
    }
  }

  async function requestAssistantAnswer({
    conversationId,
    question,
    documentIds,
    history,
    retryMessageId,
  }) {
    try {
      const answerResponse =
        await answerWorkspaceQuestion(
          workspaceId,
          {
            query: question,
            limit: 5,
            documentIds,
            conversationHistory: getHistory(history),
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
      const assistantMessage = mapMessage(
        assistantResponse.chatMessage
      );

      updateConversationFromResponse(
        assistantResponse.conversation
      );
      setMessagesByConversation((current) => {
        const conversationMessages =
          current[conversationId] ?? [];
        const nextMessages = retryMessageId
          ? conversationMessages.map((message) =>
              message.id === retryMessageId
                ? assistantMessage
                : message
            )
          : [
              ...conversationMessages,
              assistantMessage,
            ];

        return {
          ...current,
          [conversationId]: nextMessages,
        };
      });
      setSelectedMentionDocuments([]);
    } catch (error) {
      const retryMessage = createRetryMessage({
        conversationId,
        content: getAnswerFailureMessage(error),
        retryQuestion: question,
        documentIds,
      });

      setMessagesByConversation((current) => {
        const conversationMessages =
          current[conversationId] ?? [];
        const nextMessages = retryMessageId
          ? conversationMessages.map((message) =>
              message.id === retryMessageId
                ? retryMessage
                : message
            )
          : [
              ...conversationMessages,
              retryMessage,
            ];

        return {
          ...current,
          [conversationId]: nextMessages,
        };
      });
    }
  }

  async function retryAssistantAnswer(message) {
    if (
      isAwaitingResponseRef.current ||
      !token ||
      !workspaceId ||
      !activeConversationId
    ) {
      return;
    }

    isAwaitingResponseRef.current = true;
    setChatError("");
    setIsTyping(true);

    try {
      const history = (
        messagesByConversation[
          activeConversationId
        ] ?? []
      ).filter(
        (item) => item.id !== message.id
      );

      await requestAssistantAnswer({
        conversationId: activeConversationId,
        question: message.retryQuestion,
        documentIds:
          message.retryDocumentIds ?? [],
        history,
        retryMessageId: message.id,
      });
    } finally {
      isAwaitingResponseRef.current = false;
      setIsTyping(false);
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
      const documentIds = getTaggedDocumentIds({
        message: text,
        selectedDocuments:
          selectedMentionDocuments,
        documents,
      });
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

      await requestAssistantAnswer({
        conversationId,
        question: text,
        documentIds,
        history: existingMessages,
      });
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
            aria-label="New conversation"
            onClick={handleCreateConversation}
            disabled={
              isLoadingConversations || isTyping
            }
          >
            <Plus
              className="conversation-create-icon"
              size={17}
            />
            <span className="conversation-create-label">
              New Conversation
            </span>
          </button>
        </div>

        <div className="conversation-items">
          {isLoadingConversations ? (
            <ConversationListSkeleton />
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
                        setMessageInput("");
                        setSelectedMentionDocuments(
                          []
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
            <ChatMessagesSkeleton />
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
                ) : message.isRetryableError ? (
                  <div className="message-retry-panel">
                    <p>{message.content}</p>
                    <button
                      type="button"
                      onClick={() =>
                        retryAssistantAnswer(message)
                      }
                      disabled={isTyping}
                    >
                      Retry response
                    </button>
                  </div>
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
                {!message.isRetryableError &&
                  message.citations?.length > 0 && (
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
          <PreviewPanel
            citation={activeCitation}
            citationHighlightText={
              getCitationEvidenceText(activeCitation)
            }
            document={activeCitationDocument}
            error={citationPreviewState.error}
            fileUrl={citationPreviewState.fileUrl}
            html={citationPreviewState.html}
            initialPageNumber={
              activeCitation.pageNumber
            }
            isLoading={
              citationPreviewState.isLoading
            }
            pages={citationPreviewState.pages}
            previewType={citationPreviewState.type}
            table={citationPreviewState.table}
            onClose={() => setActiveCitation(null)}
          />
        )}

        <form
          className="chat-input-bar"
          onSubmit={sendMessage}
        >
          <div className="chat-input-field">
            {selectedMentionDocuments.length > 0 && (
              <div className="selected-document-tags">
                {selectedMentionDocuments.map(
                  (document) => (
                    <span key={document.id}>
                      @{document.name}
                      <button
                        type="button"
                        aria-label={`Remove ${document.name}`}
                        onClick={() =>
                          removeMentionDocument(
                            document.id
                          )
                        }
                      >
                        <X size={13} />
                      </button>
                    </span>
                  )
                )}
              </div>
            )}
            {isMentionPickerOpen && (
              <div
                className="document-mention-menu"
                role="listbox"
              >
                {mentionOptions.length > 0 ? (
                  mentionOptions.map((document) => (
                    <button
                      key={document.id}
                      type="button"
                      role="option"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectMentionDocument(
                          document
                        );
                      }}
                    >
                      <strong>
                        {document.name}
                      </strong>
                      <span>{document.format}</span>
                    </button>
                  ))
                ) : (
                  <p>No matching documents</p>
                )}
              </div>
            )}
            <textarea
              ref={messageInputRef}
              rows={1}
              value={messageInput}
              onChange={(event) =>
                setMessageInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              disabled={isTyping}
              placeholder={
                isTyping
                  ? "Waiting for response"
                  : "Ask about your documents"
              }
            />
          </div>
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
