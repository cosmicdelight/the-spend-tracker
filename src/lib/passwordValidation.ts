export interface PasswordCheck {
  label: string;
  met: boolean;
}

export function validatePassword(password: string): PasswordCheck[] {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains a special character", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return validatePassword(password).every((c) => c.met);
}
