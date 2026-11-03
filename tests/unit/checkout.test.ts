import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/checkout/phone";
import { parseCustomer } from "@/lib/checkout/schema";

describe("normalizePhone()", () => {
  it("accepts common Macedonian formats", () => {
    expect(normalizePhone("070 123 456")).toBe("+38970123456");
    expect(normalizePhone("070/123-456")).toBe("+38970123456");
    expect(normalizePhone("+389 70 123 456")).toBe("+38970123456");
    expect(normalizePhone("00389 70 123 456")).toBe("+38970123456");
    expect(normalizePhone("38970123456")).toBe("+38970123456");
    expect(normalizePhone("70123456")).toBe("+38970123456");
    expect(normalizePhone("02 3123 456")).toBe("+38923123456");
  });
  it("accepts international numbers", () => {
    expect(normalizePhone("+49 151 2345 6789")).toBe("+4915123456789");
    expect(normalizePhone("+355 69 123 4567")).toBe("+355691234567");
  });
  it("rejects junk", () => {
    for (const bad of ["", "abc", "123", "+389 70 123", "+389 70 123 4567", "070 123 456 ext 5", "+38+970123456", null, 7012]) {
      expect(normalizePhone(bad as unknown)).toBeNull();
    }
  });
});

describe("parseCustomer()", () => {
  const good = {
    first_name: " Ana ",
    last_name: "Petrovska",
    phone: "070 123 456",
    email: "",
    street_address: "Ul. Makedonija 12",
    city: "Skopje",
    postal_code: "",
    delivery_notes: "Ring twice\nThird floor",
    order_notes: "",
  };
  it("accepts a minimal valid customer; optional fields become null", () => {
    const r = parseCustomer(good);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.first_name).toBe("Ana");
      expect(r.value.phone_normalized).toBe("+38970123456");
      expect(r.value.email).toBeNull();
      expect(r.value.postal_code).toBeNull();
      expect(r.value.delivery_notes).toBe("Ring twice\nThird floor");
    }
  });
  it("reports field errors with codes", () => {
    const r = parseCustomer({ ...good, first_name: "", phone: "12", email: "nope", city: "x".repeat(101) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual({ first_name: "required", phone: "invalidPhone", email: "invalidEmail", city: "tooLong" });
  });
  it("collapses newlines in single-line fields and strips control chars", () => {
    const r = parseCustomer({ ...good, street_address: "Ul. 1\nSkopje\u0000" });
    expect(r.ok && r.value.street_address).toBe("Ul. 1 Skopje");
  });
  it("ignores non-string input safely", () => {
    const r = parseCustomer({ ...good, first_name: { $gt: "" } as unknown as string });
    expect(!r.ok && r.errors.first_name).toBe("required");
  });
});
