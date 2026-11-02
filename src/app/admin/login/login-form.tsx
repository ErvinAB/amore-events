"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, TextInput } from "@/components/ui/field";
import type { AdminStrings } from "@/messages/admin/mk";

export function LoginForm({ t }: { t: AdminStrings["login"] }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.error ? <FormMessage tone="error">{state.error}</FormMessage> : null}
      <Field id="email" label={t.email}>
        <TextInput id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} />
      </Field>
      <Field id="password" label={t.password}>
        <TextInput id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
