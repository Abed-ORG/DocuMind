import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

function AuthField({
  id,
  name,
  label,
  type,
  autoComplete,
  value,
  error,
  placeholder,
  onChange,
}) {
  const [isPasswordVisible, setIsPasswordVisible] =
    useState(false);
  const errorId = `${id}-error`;
  const isPasswordField = type === "password";
  const inputType =
    isPasswordField && isPasswordVisible
      ? "text"
      : type;

  return (
    <div className="form-group">
      <label htmlFor={id}>
        {label}
      </label>

      <div
        className={
          isPasswordField
            ? "auth-input-wrap has-password-toggle"
            : "auth-input-wrap"
        }
      >
        <input
          id={id}
          name={name}
          type={inputType}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? errorId : undefined
          }
          placeholder={placeholder}
        />

        {isPasswordField && (
          <button
            className="password-toggle"
            type="button"
            aria-label={
              isPasswordVisible
                ? "Hide password"
                : "Show password"
            }
            aria-pressed={isPasswordVisible}
            onClick={() =>
              setIsPasswordVisible(
                (isVisible) => !isVisible,
              )
            }
          >
            {isPasswordVisible ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export default AuthField;
