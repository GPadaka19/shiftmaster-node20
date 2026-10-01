import { useActionState, useTransition, type FormEvent } from "react";
import type { FormState } from "@/lib/forms";

/**
 * useActionState without React's automatic form reset. A form passed to
 * `action={...}` is reset after every submit, which snaps <select>s back to
 * their first-render option and wipes what the user typed. Edit forms should
 * keep showing what was saved (or what was rejected), so they submit through
 * this hook's onSubmit instead.
 */
export function useFormAction(action: (state: FormState, formData: FormData) => Promise<FormState>) {
  const [state, dispatch, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return [state, onSubmit, pending] as const;
}
