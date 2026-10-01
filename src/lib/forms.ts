import type { z } from "zod";

/** What a form's Server Action returns to useActionState. */
export type FormState = {
  error?: string;
  /** Field name → message, for inline errors. */
  fieldErrors?: Record<string, string>;
  /** What was submitted, so a rejected form keeps its input after React resets it. */
  values?: Record<string, string>;
  success?: string;
};

/** The submitted text fields, minus Next.js' internal $ACTION_ entries. */
export function submittedValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
  }
  return values;
}

/** The first message per field. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}
