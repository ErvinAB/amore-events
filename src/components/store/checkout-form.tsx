"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { useCart } from "@/lib/cart/store";
import { useCartQuote } from "@/lib/cart/use-quote";
import { getCheckoutToken, placeOrder, type CheckoutState } from "@/lib/checkout/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, TextArea, TextInput, describedBy } from "@/components/ui/field";
import { LineItem, Totals } from "./line-item";

type FieldName = "first_name" | "last_name" | "phone" | "email" | "street_address" | "city" | "postal_code" | "delivery_notes" | "order_notes";

export function CheckoutForm({ locale, t }: { locale: Locale; t: Dictionary }) {
  const cart = useCart();
  const { quote, loading, refresh } = useCartQuote(cart.lines);
  const [state, dispatch, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const [token, setToken] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const c = t.checkout;

  // Signed "form opened at" token (realistic completion check).
  useEffect(() => {
    getCheckoutToken().then(setToken, () => setToken(""));
  }, []);

  // React to server results: refresh quote/token, move focus to the problem.
  useEffect(() => {
    if (state.refreshCart) refresh();
    if (state.formError === "sessionExpired" || state.formError === "tooFast") getCheckoutToken().then(setToken);
    const form = formRef.current;
    if (!form) return;
    const target = form.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form.querySelector<HTMLElement>("#checkout-error");
    target?.focus();
  }, [state, refresh]);

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-ink-muted">{c.empty}</p>
        <ButtonLink href={localePath(locale, "/shop")} variant="secondary">
          {t.bag.continue}
        </ButtonLink>
      </div>
    );
  }

  const err = (f: FieldName) => {
    const code = state.fieldErrors?.[f];
    return code ? c.errors[code as keyof typeof c.errors] : undefined;
  };
  const input = (
    f: FieldName,
    label: string,
    extra: React.ComponentProps<typeof TextInput> & { hint?: string; optional?: boolean } = {},
  ) => {
    const { hint, optional, ...rest } = extra;
    const e = err(f);
    return (
      <Field id={f} label={label} hint={hint} error={e} optionalLabel={optional ? c.optional : undefined}>
        <TextInput
          id={f}
          name={f}
          required={!optional}
          aria-invalid={e ? true : undefined}
          aria-describedby={describedBy(f, { hint, error: e })}
          {...rest}
        />
      </Field>
    );
  };

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set("cart", JSON.stringify(cart.lines));
    data.set("locale", locale);
    data.set("form_token", token);
    startTransition(() => dispatch(data));
  }

  const formError = state.formError
    ? c.errors[state.formError]
    : state.fieldErrors && Object.keys(state.fieldErrors).length
      ? c.errors.summary
      : null;
  const canSubmit = !!quote?.canCheckout && !loading && !pending && !!token;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-14">
      <div className="flex flex-col gap-8">
        {formError ? (
          <p id="checkout-error" role="alert" tabIndex={-1} className="rounded-control border border-error/30 bg-error-tint px-4 py-3 text-sm text-error">
            {formError}{" "}
            {state.formError === "cartChanged" ? (
              <Link href={localePath(locale, "/cart")} className="underline">
                {c.edit}
              </Link>
            ) : null}
          </p>
        ) : null}

        <fieldset className="flex flex-col gap-4">
          <legend className="heading-3 mb-4">{c.contact}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {input("first_name", c.firstName, { autoComplete: "given-name", maxLength: 80 })}
            {input("last_name", c.lastName, { autoComplete: "family-name", maxLength: 80 })}
          </div>
          {input("phone", c.phone, { type: "tel", autoComplete: "tel", inputMode: "tel", maxLength: 40, hint: c.phoneHint })}
          {input("email", c.email, { type: "email", autoComplete: "email", inputMode: "email", maxLength: 200, hint: c.emailHint, optional: true })}
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="heading-3 mb-4">{c.address}</legend>
          {input("street_address", c.street, { autoComplete: "street-address", maxLength: 300 })}
          <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-4">
            {input("city", c.city, { autoComplete: "address-level2", maxLength: 100 })}
            {input("postal_code", c.postalCode, { autoComplete: "postal-code", inputMode: "numeric", maxLength: 20, optional: true })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="heading-3 mb-4">{c.notes}</legend>
          {(["delivery_notes", "order_notes"] as const).map((f) => {
            const e = err(f);
            const hint = f === "delivery_notes" ? c.deliveryNotesHint : c.orderNotesHint;
            return (
              <Field key={f} id={f} label={f === "delivery_notes" ? c.deliveryNotes : c.orderNotes} hint={hint} error={e} optionalLabel={c.optional}>
                <TextArea id={f} name={f} rows={3} maxLength={1000} aria-invalid={e ? true : undefined} aria-describedby={describedBy(f, { hint, error: e })} />
              </Field>
            );
          })}
        </fieldset>

        {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="company_website">Company website</label>
          <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>
      </div>

      <aside className="flex h-fit flex-col gap-6 lg:sticky lg:top-24">
        <section aria-labelledby="summary-title" className="flex flex-col gap-5 rounded-image bg-tissue p-5 sm:p-6" aria-busy={loading}>
          <div className="flex items-baseline justify-between">
            <h2 id="summary-title" className="heading-3">
              {c.summary}
            </h2>
            <Link href={localePath(locale, "/cart")} className="text-sm underline underline-offset-4">
              {c.edit}
            </Link>
          </div>
          {quote ? (
            <>
              <ul className="flex flex-col gap-4">
                {quote.lines.map((l) => (
                  <li key={l.lineId}>
                    <LineItem line={l} locale={locale} currency={quote.currency} t={t} compact />
                  </li>
                ))}
              </ul>
              <Totals subtotal={quote.subtotalMinor} delivery={quote.deliveryFeeMinor} total={quote.totalMinor} currency={quote.currency} locale={locale} t={t} />
            </>
          ) : (
            <p className="text-sm text-ink-muted">{t.bag.updating}</p>
          )}
        </section>

        <section aria-labelledby="payment-title" className="rounded-image border border-line p-5 sm:p-6">
          <h2 id="payment-title" className="text-sm font-medium text-ink-muted">
            {c.payment}
          </h2>
          <p className="mt-1 font-medium">{c.codTitle}</p>
          <p className="mt-1 text-sm text-ink-muted">{c.codBody}</p>
        </section>

        <Button type="submit" className="w-full" disabled={!canSubmit}>
          {pending ? c.placing : c.placeOrder}
        </Button>
      </aside>
    </form>
  );
}
