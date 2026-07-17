import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router";
import { FileSearch } from "lucide-react";

import { useAuth } from "../context/AuthContext";

const initialFormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function validateForm(formData) {
  const errors = {};

  if (!formData.firstName.trim()) {
    errors.firstName =
      "First name is required.";
  } else if (
    formData.firstName.trim().length > 50
  ) {
    errors.firstName =
      "First name cannot exceed 50 characters.";
  }

  if (!formData.lastName.trim()) {
    errors.lastName =
      "Last name is required.";
  } else if (
    formData.lastName.trim().length > 50
  ) {
    errors.lastName =
      "Last name cannot exceed 50 characters.";
  }

  if (!formData.email.trim()) {
    errors.email = "Email is required.";
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      formData.email
    )
  ) {
    errors.email =
      "Enter a valid email address.";
  }

  if (!formData.password) {
    errors.password =
      "Password is required.";
  } else if (formData.password.length < 8) {
    errors.password =
      "Password must contain at least 8 characters.";
  } else if (
    !/[a-z]/.test(formData.password)
  ) {
    errors.password =
      "Password must contain a lowercase letter.";
  } else if (
    !/[A-Z]/.test(formData.password)
  ) {
    errors.password =
      "Password must contain an uppercase letter.";
  } else if (
    !/[0-9]/.test(formData.password)
  ) {
    errors.password =
      "Password must contain a number.";
  }

  if (!formData.confirmPassword) {
    errors.confirmPassword =
      "Please confirm your password.";
  } else if (
    formData.confirmPassword !==
    formData.password
  ) {
    errors.confirmPassword =
      "Passwords do not match.";
  }

  return errors;
}

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

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
      await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      if (
        Array.isArray(error.errors) &&
        error.errors.length > 0
      ) {
        const backendFieldErrors = {};

        error.errors.forEach(
          ({ field, message }) => {
            backendFieldErrors[field] =
              message;
          }
        );

        setFieldErrors(backendFieldErrors);
      }

      setServerError(
        error.message ||
          "Unable to create your account."
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
            <p className="eyebrow">
              Start organizing
            </p>

            <h1>Create your account</h1>

            <p>
              Build intelligent workspaces for
              your documents.
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
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first-name">
                  First name
                </label>

                <input
                  id="first-name"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleChange}
                  aria-invalid={Boolean(
                    fieldErrors.firstName
                  )}
                  placeholder="Hussein"
                />

                {fieldErrors.firstName && (
                  <p className="field-error">
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="last-name">
                  Last name
                </label>

                <input
                  id="last-name"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleChange}
                  aria-invalid={Boolean(
                    fieldErrors.lastName
                  )}
                  placeholder="Marji"
                />

                {fieldErrors.lastName && (
                  <p className="field-error">
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="register-email">
                Email address
              </label>

              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                aria-invalid={Boolean(
                  fieldErrors.email
                )}
                placeholder="you@example.com"
              />

              {fieldErrors.email && (
                <p className="field-error">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="register-password">
                Password
              </label>

              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                aria-invalid={Boolean(
                  fieldErrors.password
                )}
                placeholder="At least 8 characters"
              />

              {fieldErrors.password && (
                <p className="field-error">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">
                Confirm password
              </label>

              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                aria-invalid={Boolean(
                  fieldErrors.confirmPassword
                )}
                placeholder="Enter your password again"
              />

              {fieldErrors.confirmPassword && (
                <p className="field-error">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Creating account..."
                : "Create Account"}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account?{" "}
            <Link to="/login">Log In</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export default RegisterPage;
