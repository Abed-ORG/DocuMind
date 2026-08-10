import { Link } from "react-router";

import DocuMindLogo from "../../../components/DocuMindLogo";

function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container footer-content">
        <div>
          <Link className="footer-brand" to="/">
            <DocuMindLogo className="footer-brand-logo" />
          </Link>
          <p>Built by Hussein Marji - GDC Internship 2026</p>
        </div>

        <nav className="footer-links" aria-label="Footer navigation">
          <Link to="/login">Login</Link>
          <Link to="/register">Sign Up</Link>
        </nav>
      </div>
    </footer>
  );
}

export default LandingFooter;
