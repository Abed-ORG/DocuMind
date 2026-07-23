import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router";

import { useAuth } from "../../context/AuthContext";
import {
  initialRegisterFormData,
  validateRegisterForm,
} from "./authValidation";
import AuthShell from "./components/AuthShell";
import RegisterForm from "./components/RegisterForm";

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] =
    useState(initialRegisterFormData);

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
      validateRegisterForm(formData);

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
    <AuthShell
      eyebrow="Start organizing"
      title="Create your account"
      description="Build intelligent workspaces for your documents."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login">Log In</Link>
        </>
      }
    >
      {serverError && (
        <div className="alert alert-error">
          {serverError}
        </div>
      )}

      <RegisterForm
        formData={formData}
        fieldErrors={fieldErrors}
        isSubmitting={isSubmitting}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </AuthShell>
  );
}

export default RegisterPage;
