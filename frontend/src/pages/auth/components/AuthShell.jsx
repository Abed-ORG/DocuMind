import { Link } from "react-router";
import { FileSearch } from "lucide-react";

function AuthShell({
  eyebrow,
  title,
  description,
  footer,
  children,
}) {
  return (
    <section className="auth-page">
      <div className="auth-shell">
        <Link className="auth-brand" to="/">
          <span className="auth-brand-mark">
            <FileSearch size={21} />
          </span>
          DocuMind
        </Link>

        <div className="auth-card">
          <div className="auth-heading">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          {children}

          <p className="auth-footer">
            {footer}
          </p>
        </div>
      </div>
    </section>
  );
}

export default AuthShell;
