function AuthShell({
  eyebrow,
  title,
  description,
  footer,
  variant = "login",
  children,
}) {
  return (
    <section className={`auth-page auth-page-${variant}`}>
      <div className="auth-background" aria-hidden="true">
        <span className="floating-document floating-document-1" />
        <span className="floating-document floating-document-2" />
        <span className="floating-document floating-document-3" />
        <span className="floating-document floating-document-4" />
        <span className="floating-document floating-document-5" />
        <span className="floating-document floating-document-6" />
      </div>

      <div className="auth-shell">
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
