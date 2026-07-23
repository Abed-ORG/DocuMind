import AuthField from "./AuthField";

function RegisterForm({
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
      <div className="form-row">
        <AuthField
          id="first-name"
          name="firstName"
          label="First name"
          type="text"
          autoComplete="given-name"
          value={formData.firstName}
          error={fieldErrors.firstName}
          placeholder="Hussein"
          onChange={onChange}
        />

        <AuthField
          id="last-name"
          name="lastName"
          label="Last name"
          type="text"
          autoComplete="family-name"
          value={formData.lastName}
          error={fieldErrors.lastName}
          placeholder="Marji"
          onChange={onChange}
        />
      </div>

      <AuthField
        id="register-email"
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
        id="register-password"
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        value={formData.password}
        error={fieldErrors.password}
        placeholder="At least 8 characters"
        onChange={onChange}
      />

      <AuthField
        id="confirm-password"
        name="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={formData.confirmPassword}
        error={fieldErrors.confirmPassword}
        placeholder="Enter your password again"
        onChange={onChange}
      />

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
  );
}

export default RegisterForm;
