import { Link } from "react-router";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

function HeroSection({ isAuthenticated }) {
  const primaryDestination = isAuthenticated
    ? "/dashboard"
    : "/register";

  return (
    <section className="hero-section">
      <div className="hero-motion-background" aria-hidden="true">
        <span className="hero-document hero-document-1" />
        <span className="hero-document hero-document-2" />
        <span className="hero-document hero-document-3" />
        <span className="hero-data-stream hero-data-stream-1" />
        <span className="hero-data-stream hero-data-stream-2" />
      </div>

      <div className="landing-container hero-grid">
        <div className="hero-content">
          <h1>DocuMind</h1>

          <p className="hero-tagline">
            Turn scattered documents into trusted answers.
          </p>

          <p className="hero-description">
            Upload documents, ask cited questions, summarize long files,
            compare evidence across sources, and extract structured data
            from one calm workspace.
          </p>

          <div className="hero-actions">
            <Link className="landing-primary-button" to={primaryDestination}>
              {isAuthenticated ? "Open Dashboard" : "Get Started"}
              <ArrowRight size={18} />
            </Link>

            <a className="landing-secondary-button" href="#features">
              Explore Features
            </a>
          </div>

          <div className="hero-trust-row">
            <span>
              <CheckCircle2 size={16} />
              Source-backed answers
            </span>
            <span>
              <CheckCircle2 size={16} />
              Workspace-first organization
            </span>
            <span>
              <CheckCircle2 size={16} />
              Export-ready results
            </span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-product-demo">
            <div className="demo-top-bar">
              <span className="demo-window-dot" />
              <span className="demo-window-dot" />
              <span className="demo-window-dot" />
              <span className="demo-title">
                Contract Review Workspace
              </span>
            </div>

            <div className="demo-workspace">
              <section className="demo-document-panel">
                <div className="demo-panel-header">
                  <span className="demo-panel-icon">
                    <FileText size={16} />
                  </span>
                  <span>Service Agreement.pdf</span>
                </div>

                <div className="demo-document-page">
                  <div className="demo-document-heading" />
                  <div className="demo-line demo-line-wide" />
                  <div className="demo-line" />
                  <div className="demo-line demo-line-short" />

                  <div className="demo-highlight-row demo-highlight-row-1">
                    <span className="demo-highlight-label">1</span>
                    <div className="demo-highlight-copy">
                      <span />
                      <span />
                    </div>
                  </div>

                  <div className="demo-line demo-line-wide" />
                  <div className="demo-line" />

                  <div className="demo-highlight-row demo-highlight-row-2">
                    <span className="demo-highlight-label">2</span>
                    <div className="demo-highlight-copy">
                      <span />
                      <span />
                    </div>
                  </div>

                  <div className="demo-line demo-line-short" />
                  <div className="demo-line demo-line-wide" />

                  <div className="demo-highlight-row demo-highlight-row-3">
                    <span className="demo-highlight-label">3</span>
                    <div className="demo-highlight-copy">
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              </section>

              <section className="demo-chat-panel">
                <div className="demo-panel-header">
                  <span className="demo-panel-icon demo-chat-icon">
                    <MessageSquareText size={16} />
                  </span>
                  <span>DocuMind Chat</span>
                </div>

                <div className="demo-status-row">
                  <span className="demo-status demo-status-reading">
                    Reading document
                  </span>
                  <span className="demo-status demo-status-highlighting">
                    Highlighting evidence
                  </span>
                  <span className="demo-status demo-status-ready">
                    Summary ready
                  </span>
                </div>

                <div className="demo-chat-question">
                  <span className="demo-user-avatar">HM</span>
                  <span className="demo-typed-text">
                    Summarize the obligations in this agreement
                  </span>
                </div>

                <div className="demo-answer-card">
                  <div className="demo-answer-heading">
                    <Sparkles size={16} />
                    <span>Generated summary</span>
                  </div>

                  <div className="demo-summary-lines">
                    <p className="demo-summary-line demo-summary-line-1">
                      Vendor must deliver monthly reports and notify the
                      client before delays.
                    </p>
                    <p className="demo-summary-line demo-summary-line-2">
                      Client approval is required before scope or price
                      changes.
                    </p>
                    <p className="demo-summary-line demo-summary-line-3">
                      Renewal terms require written confirmation before the
                      deadline.
                    </p>
                  </div>

                  <div className="demo-source-row">
                    <span className="demo-source-chip demo-source-chip-1">
                      Source 1
                    </span>
                    <span className="demo-source-chip demo-source-chip-2">
                      Source 2
                    </span>
                    <span className="demo-source-chip demo-source-chip-3">
                      Source 3
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
