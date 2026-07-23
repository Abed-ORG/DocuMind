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
  const errorId = `${id}-error`;

  return (
    <div className="form-group">
      <label htmlFor={id}>
        {label}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? errorId : undefined
        }
        placeholder={placeholder}
      />

      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export default AuthField;
