import AuthField from "./AuthField";

function LoginForm({
  formData,
  fieldErrors,
  isSubmitting,
  onChange,
  onSubmit,
}) {
  return (
    <form
      className="auth-form"
      onSubmit={onSubmit}
      noValidate
    >
      <AuthField
        id="login-email"
        name="email"
        label="Email address"
        type="email"
        autoComplete="email"
        value={formData.email}
        error={fieldErrors.email}
        placeholder="you@example.com"
        onChange={onChange}
      />

      <AuthField
        id="login-password"
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={formData.password}
        error={fieldErrors.password}
        placeholder="Enter your password"
        onChange={onChange}
      />

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
  );
}

export default LoginForm;
