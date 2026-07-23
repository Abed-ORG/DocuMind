import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router";

import { useAuth } from "../../context/AuthContext";
import {
  initialLoginFormData,
  validateLoginForm,
} from "./authValidation";
import AuthShell from "./components/AuthShell";
import LoginForm from "./components/LoginForm";

function LoginPage() {
  const navigate = useNavigate();

  const location = useLocation();

  const destination =
    location.state?.from ??
    "/dashboard";

  const { login } = useAuth();

  const [formData, setFormData] =
    useState(initialLoginFormData);

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
      validateLoginForm(formData);

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
    <AuthShell
      eyebrow="Welcome back"
      title="Log in to DocuMind"
      description="Access your workspaces and documents."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link to="/register">
            Register
          </Link>
        </>
      }
    >
      {serverError && (
        <div className="alert alert-error">
          {serverError}
        </div>
      )}

      <LoginForm
        formData={formData}
        fieldErrors={fieldErrors}
        isSubmitting={isSubmitting}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </AuthShell>
  );
}

export default LoginPage;
