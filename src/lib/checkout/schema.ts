import { z } from "zod";
import { cleanText } from "@/lib/validation/common";
import { normalizePhone } from "./phone";

/** Field error codes → translated in the dictionary (checkout.errors.*). */
export type CustomerErrorCode = "required" | "tooLong" | "invalidPhone" | "invalidEmail" | "invalidPostalCode" | "tooShort";

export type CustomerInput = {
  first_name: string;
  last_name: string;
  phone: string;
  phone_normalized: string;
  email: string | null;
  street_address: string;
  city: string;
  postal_code: string | null;
  delivery_notes: string | null;
  order_notes: string | null;
};

export const CUSTOMER_FIELDS = [
  "first_name",
  "last_name",
  "phone",
  "email",
  "street_address",
  "city",
  "postal_code",
  "delivery_notes",
  "order_notes",
] as const;

const emailSchema = z.email();

/** Validate checkout customer fields from untrusted input (server and client). */
export function parseCustomer(input: Record<string, unknown>):
  | { ok: true; value: CustomerInput }
  | { ok: false; errors: Partial<Record<(typeof CUSTOMER_FIELDS)[number], CustomerErrorCode>> } {
  const errors: Partial<Record<(typeof CUSTOMER_FIELDS)[number], CustomerErrorCode>> = {};
  const text = (k: (typeof CUSTOMER_FIELDS)[number], { required, max, min = 1 }: { required: boolean; max: number; min?: number }) => {
    const v = cleanText(input[k]).replace(k.endsWith("notes") ? /$^/ : /\s*\n\s*/g, " ");
    if (!v) {
      if (required) errors[k] = "required";
      return null;
    }
    if (v.length > max) errors[k] = "tooLong";
    else if (v.length < min) errors[k] = "tooShort";
    return v;
  };

  const first_name = text("first_name", { required: true, max: 80 });
  const last_name = text("last_name", { required: true, max: 80 });
  const phone = text("phone", { required: true, max: 40 });
  const phone_normalized = phone ? normalizePhone(phone) : null;
  if (phone && !phone_normalized && !errors.phone) errors.phone = "invalidPhone";
  const email = text("email", { required: false, max: 200 });
  if (email && !errors.email && !emailSchema.safeParse(email).success) errors.email = "invalidEmail";
  const street_address = text("street_address", { required: true, max: 300, min: 3 });
  const city = text("city", { required: true, max: 100 });
  const postal_code = text("postal_code", { required: false, max: 20 });
  if (postal_code && !errors.postal_code && !/^[A-Za-z0-9 -]{2,20}$/.test(postal_code)) errors.postal_code = "invalidPostalCode";
  const delivery_notes = text("delivery_notes", { required: false, max: 1000 });
  const order_notes = text("order_notes", { required: false, max: 1000 });

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      first_name: first_name!,
      last_name: last_name!,
      phone: phone!,
      phone_normalized: phone_normalized!,
      email: email?.toLowerCase() ?? null,
      street_address: street_address!,
      city: city!,
      postal_code,
      delivery_notes,
      order_notes,
    },
  };
}
