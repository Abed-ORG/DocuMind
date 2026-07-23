export const initialLoginFormData = {
  email: "",
  password: "",
};

export const initialRegisterFormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function validateLoginForm(formData) {
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

export function validateRegisterForm(formData) {
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
