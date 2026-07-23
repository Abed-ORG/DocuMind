import { Link } from "react-router";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
} from "lucide-react";

import documindHero from "../../../assets/documind-hero.png";

function HeroSection({ isAuthenticated }) {
  const primaryDestination = isAuthenticated
    ? "/dashboard"
    : "/register";

  return (
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
  );
}

export default HeroSection;
