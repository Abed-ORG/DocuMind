import { Link } from "react-router";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  GitCompareArrows,
  MessageSquareText,
  ScanText,
  UploadCloud,
} from "lucide-react";

import documindHero from "../assets/documind-hero.png";
import { useAuth } from "../context/AuthContext";
import "./HomePage.css";

const features = [
  {
    icon: UploadCloud,
    title: "Document Upload",
    description:
      "Bring PDF, DOCX, TXT, and CSV files into focused workspaces with visible processing states.",
  },
  {
    icon: MessageSquareText,
    title: "AI Q&A With Citations",
    description:
      "Ask natural questions and review answers with source chips tied back to the original page.",
  },
  {
    icon: FileText,
    title: "Summarization",
    description:
      "Switch between one-liner, executive, and detailed summaries without leaving the document flow.",
  },
  {
    icon: GitCompareArrows,
    title: "Cross-Doc Comparison",
    description:
      "Compare two files against the same topic and see what agrees, conflicts, or needs review.",
  },
  {
    icon: ScanText,
    title: "Structured Extraction",
    description:
      "Turn dates, amounts, obligations, and entities into sortable tables that can be exported.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Create a workspace",
    description:
      "Group documents by client, matter, project, or research stream.",
  },
  {
    step: "02",
    title: "Upload and process",
    description:
      "DocuMind extracts pages, tracks status, and prepares content for retrieval.",
  },
  {
    step: "03",
    title: "Ask, cite, compare",
    description:
      "Use chat, summaries, analytics, and extraction to move from files to evidence.",
  },
];

function HomePage() {
  const { isAuthenticated } = useAuth();

  const primaryDestination = isAuthenticated
    ? "/dashboard"
    : "/register";

  return (
    <div className="landing-page">
      <section className="hero-section">
        <div className="landing-container hero-grid">
          <div className="hero-content">
            <div className="hero-badge">
              <Bot size={17} />
              AI document intelligence
            </div>

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
            <img
              src={documindHero}
              alt=""
              className="hero-product-image"
            />
          </div>
        </div>
      </section>

      <main>
        <section id="features" className="landing-section">
          <div className="landing-container">
            <div className="section-heading">
              <p className="landing-eyebrow">Features</p>
              <h2>Designed for evidence-heavy work</h2>
              <p>
                Every surface keeps documents, answers, and citations close
                together so review work stays traceable.
              </p>
            </div>

            <div className="features-grid">
              {features.map(({ icon: Icon, title, description }) => (
                <article className="feature-card" key={title}>
                  <div className="feature-icon">
                    <Icon size={22} />
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section workflow-section">
          <div className="landing-container">
            <div className="section-heading">
              <p className="landing-eyebrow">How It Works</p>
              <h2>From upload to insight in three steps</h2>
              <p>
                A compact flow for creating a workspace, processing files,
                and using AI with citations.
              </p>
            </div>

            <div className="workflow-grid">
              {workflowSteps.map(({ step, title, description }) => (
                <article className="workflow-card" key={step}>
                  <span className="workflow-step">{step}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container footer-content">
          <div>
            <Link className="footer-brand" to="/">
              DocuMind
            </Link>
            <p>Built by Hussein Marji - GDC Internship 2026</p>
          </div>

          <nav className="footer-links" aria-label="Footer navigation">
            <Link to="/login">Login</Link>
            <Link to="/register">Sign Up</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
