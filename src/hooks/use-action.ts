import { useState, useTransition } from "react";
import type { FormState } from "@/lib/forms";

/**
 * Runs a Server Action from a button (no form) and keeps its result for
 * <FormMessage>. The previous message is cleared when a new run starts.
 * Actions that throw work away ask first with <ConfirmButton>.
 */
export function useAction<T extends FormState = FormState>() {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<T>({} as T);

  function run(action: () => Promise<T>) {
    setState({} as T);
    startTransition(async () => setState(await action()));
  }

  return { pending, state, run };
}
