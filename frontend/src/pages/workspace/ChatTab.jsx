import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Bot,
  Search,
  Send,
  X,
} from "lucide-react";

import { initialConversations } from "./workspaceData";

function ChatTab() {
  const [conversations, setConversations] =
    useState(initialConversations);

  const [activeConversationId, setActiveConversationId] =
    useState(initialConversations[0].id);

  const [conversationSearch, setConversationSearch] =
    useState("");

  const [messageInput, setMessageInput] =
    useState("");

  const [isTyping, setIsTyping] = useState(false);

  const [activeCitation, setActiveCitation] =
    useState(null);

  const messageEndRef = useRef(null);
  const isAwaitingResponseRef = useRef(false);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId
  );

  const filteredConversations = conversations.filter((conversation) =>
    conversation.title
      .toLowerCase()
      .includes(conversationSearch.toLowerCase())
  );

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [activeConversation?.messages.length, isTyping]);

  function createConversation() {
    const id = `conv-${Date.now()}`;

    setConversations((current) => [
      {
        id,
        title: "New Conversation",
        timestamp: "Just now",
        messages: [],
      },
      ...current,
    ]);
    setActiveConversationId(id);
    setActiveCitation(null);
  }

  function sendMessage(event) {
    event.preventDefault();

    if (isAwaitingResponseRef.current) {
      return;
    }

    const text = messageInput.trim();

    if (!text || !activeConversation || isTyping) {
      return;
    }

    isAwaitingResponseRef.current = true;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              title:
                conversation.title === "New Conversation"
                  ? text.slice(0, 34)
                  : conversation.title,
              timestamp: "Just now",
              messages: [
                ...conversation.messages,
                userMessage,
              ],
            }
          : conversation
      )
    );

    setMessageInput("");
    setIsTyping(true);

    window.setTimeout(() => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversationId
            ? {
                ...conversation,
                messages: [
                  ...conversation.messages,
                  {
                    id: `ai-${Date.now()}`,
                    role: "ai",
                    text:
                      "The strongest evidence points to citation quality and review traceability. The source passages show that buyers want answers they can audit before sharing with stakeholders.",
                    citations: [
                      {
                        id: `citation-${Date.now()}`,
                        label: "2026 Market Outlook.pdf, p.3",
                        source:
                          "Enterprise buyers increasingly require retrieval transparency and an audit trail for AI-generated answers.",
                      },
                    ],
                  },
                ],
              }
            : conversation
        )
      );
      isAwaitingResponseRef.current = false;
      setIsTyping(false);
    }, 900);
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
                setConversationSearch(event.target.value)
              }
              placeholder="Search conversations"
            />
          </label>

          <button
            className="primary-action"
            type="button"
            onClick={createConversation}
          >
            New Conversation
          </button>
        </div>

        <div className="conversation-items">
          {filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              className={
                conversation.id === activeConversationId
                  ? "conversation-item is-active"
                  : "conversation-item"
              }
              type="button"
              onClick={() => {
                setActiveConversationId(conversation.id);
                setActiveCitation(null);
              }}
            >
              <strong>{conversation.title}</strong>
              <span>{conversation.timestamp}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-main">
        <div className="message-stream">
          {activeConversation?.messages.length ? (
            activeConversation.messages.map((message) => (
              <article
                key={message.id}
                className={`message-bubble ${message.role}`}
              >
                <p>{message.text}</p>
                {message.citations?.length > 0 && (
                  <div className="citation-chip-row">
                    {message.citations.map((citation) => (
                      <button
                        key={citation.id}
                        type="button"
                        onClick={() => setActiveCitation(citation)}
                      >
                        [{citation.label}]
                      </button>
                    ))}
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
            <div className="typing-indicator" aria-label="AI is typing">
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
              <strong>{activeCitation.label}</strong>
              <button
                className="icon-button"
                type="button"
                aria-label="Close citation"
                onClick={() => setActiveCitation(null)}
              >
                <X size={16} />
              </button>
            </header>
            <p>
              <mark>{activeCitation.source}</mark>
            </p>
          </aside>
        )}

        <form className="chat-input-bar" onSubmit={sendMessage}>
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
            disabled={isTyping || !messageInput.trim()}
            title="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      </section>
    </div>
  );
}

export default ChatTab;
