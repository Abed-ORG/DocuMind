import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router";
import { FileSearch } from "lucide-react";

import { useAuth } from "../context/AuthContext";

const initialFormData = {
  email: "",
  password: "",
};

function validateForm(formData) {
  const errors = {};

  if (!formData.email.trim()) {
    errors.email = "Email is required.";
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      formData.email
    )
  ) {
    errors.email = "Enter a valid email address.";
  }

  if (!formData.password) {
    errors.password = "Password is required.";
  }

  return errors;
}

function LoginPage() {
  const navigate = useNavigate();
  
  const location = useLocation();
  
  const destination =
    location.state?.from ??
    "/dashboard";
  
  const { login } = useAuth();

  const [formData, setFormData] =
    useState(initialFormData);

  const [fieldErrors, setFieldErrors] =
    useState({});

  const [serverError, setServerError] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));

    setServerError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors =
      validateForm(formData);

    if (
      Object.keys(validationErrors).length > 0
    ) {
      setFieldErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setServerError("");

    try {
      await login({
        email: formData.email.trim(),
        password: formData.password,
      });

      navigate(destination, {
        replace: true,
      });
    } catch (error) {
      setServerError(
        error.message ||
          "Unable to log in. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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
            <p className="eyebrow">Welcome back</p>
            <h1>Log in to DocuMind</h1>
            <p>
              Access your workspaces and documents.
            </p>
          </div>

          {serverError && (
            <div className="alert alert-error">
              {serverError}
            </div>
          )}

          <form
            className="auth-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="form-group">
              <label htmlFor="login-email">
                Email address
              </label>

              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                aria-invalid={Boolean(
                  fieldErrors.email
                )}
                aria-describedby={
                  fieldErrors.email
                    ? "login-email-error"
                    : undefined
                }
                placeholder="you@example.com"
              />

              {fieldErrors.email && (
                <p
                  id="login-email-error"
                  className="field-error"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="login-password">
                Password
              </label>

              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                aria-invalid={Boolean(
                  fieldErrors.password
                )}
                aria-describedby={
                  fieldErrors.password
                    ? "login-password-error"
                    : undefined
                }
                placeholder="Enter your password"
              />

              {fieldErrors.password && (
                <p
                  id="login-password-error"
                  className="field-error"
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Logging in..."
                : "Log In"}
            </button>
          </form>

          <p className="auth-footer">
            Don&apos;t have an account?{" "}
            <Link to="/register">
              Register
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export default LoginPage;
