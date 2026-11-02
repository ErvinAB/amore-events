"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import type { ActionState } from "@/lib/validation/common";

/**
 * useActionState wrapper for admin forms:
 * - submits via onSubmit so React does NOT reset the form on validation
 *   errors (owners keep what they typed)
 * - moves focus to the first invalid field (or the message) after a failed save
 */
export function useActionForm<T>(
  action: (prev: ActionState<T>, form: FormData) => Promise<ActionState<T>>,
  initial: ActionState<T> = {},
) {
  const [state, dispatch, pending] = useActionState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form || state.ok || (!state.errors && !state.message)) return;
    const target =
      form.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form.querySelector<HTMLElement>('[role="alert"]');
    target?.focus();
  }, [state]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  }

  return { state, pending, formRef, onSubmit };
}
