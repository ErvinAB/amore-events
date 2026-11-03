"use client";

import { saveSettings } from "./actions";
import { useActionForm } from "@/components/admin/use-action-form";
import { LocalizedField } from "@/components/admin/localized-field";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, TextInput, describedBy } from "@/components/ui/field";
import { moneyInputValue } from "@/lib/validation/common";
import type { LocalizedText } from "@/i18n/config";
import { adminT } from "@/messages/admin";

export type SettingsValues = {
  currency_code: string;
  delivery_fee_minor: number;
  free_delivery_threshold_minor: number | null;
  delivery_estimate: LocalizedText | null;
  support_phone: string | null;
  support_email: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
};

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const t = adminT.settings;
  const { state, pending, formRef, onSubmit } = useActionForm(saveSettings);
  const e = state.errors ?? {};
  const text = (name: keyof SettingsValues, label: string, opts: { type?: string; hint?: string; value: string | null | number } ) => (
    <Field id={name} label={label} hint={opts.hint} error={e[name]} optionalLabel={adminT.common.optional}>
      <TextInput
        id={name}
        name={name}
        type={opts.type ?? "text"}
        defaultValue={opts.value ?? ""}
        aria-invalid={!!e[name] || undefined}
        aria-describedby={describedBy(name, { hint: opts.hint, error: e[name] })}
      />
    </Field>
  );
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex max-w-2xl flex-col gap-6">
      {state.message ? <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage> : null}
      <section className="flex flex-col gap-5 rounded-control border border-line bg-paper p-4 sm:p-6">
        <h2 className="heading-3">{t.delivery}</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="delivery_fee" label={`${t.deliveryFee} (${initial.currency_code})`} hint={t.deliveryFeeHelp} error={e.delivery_fee}>
            <TextInput id="delivery_fee" name="delivery_fee" inputMode="decimal" defaultValue={moneyInputValue(initial.delivery_fee_minor)}
              aria-invalid={!!e.delivery_fee || undefined} aria-describedby={describedBy("delivery_fee", { hint: true, error: e.delivery_fee })} />
          </Field>
          <Field id="free_threshold" label={`${t.freeThreshold} (${initial.currency_code})`} hint={t.freeThresholdHelp} error={e.free_threshold} optionalLabel={adminT.common.optional}>
            <TextInput id="free_threshold" name="free_threshold" inputMode="decimal" defaultValue={moneyInputValue(initial.free_delivery_threshold_minor)}
              aria-invalid={!!e.free_threshold || undefined} aria-describedby={describedBy("free_threshold", { hint: true, error: e.free_threshold })} />
          </Field>
        </div>
        <LocalizedField name="delivery_estimate" label={t.deliveryEstimate} hint={t.deliveryEstimateHelp} value={initial.delivery_estimate} maxLength={200} error={e.delivery_estimate} />
        <p className="text-sm text-ink-muted">
          {t.currency}: <strong>{initial.currency_code}</strong>. {t.currencyHelp}
        </p>
      </section>
      <section className="flex flex-col gap-5 rounded-control border border-line bg-paper p-4 sm:p-6">
        <h2 className="heading-3">{t.contact}</h2>
        {text("support_phone", t.supportPhone, { type: "tel", value: initial.support_phone })}
        {text("support_email", t.supportEmail, { type: "email", value: initial.support_email })}
        {text("instagram_url", t.instagram, { type: "url", value: initial.instagram_url })}
        {text("facebook_url", t.facebook, { type: "url", value: initial.facebook_url })}
        {text("tiktok_url", t.tiktok, { type: "url", value: initial.tiktok_url })}
      </section>
      <div>
        <Button type="submit" disabled={pending}>{pending ? adminT.common.saving : adminT.common.save}</Button>
      </div>
    </form>
  );
}
