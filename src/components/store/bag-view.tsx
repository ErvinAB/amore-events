"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { localized, localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { cartActions, useCart } from "@/lib/cart/store";
import { describeCartProducts, type CartProductInfo } from "@/lib/cart/describe";
import { productImageUrl } from "@/lib/catalog/images";
import { formatMoney } from "@/lib/money";
import { ButtonLink } from "@/components/ui/button";

/** V0.1 bag: shows what was added. Editing and checkout arrive in V0.2. */
export function BagView({ locale, currency, t }: { locale: Locale; currency: string; t: Dictionary }) {
  const cart = useCart();
  const [info, setInfo] = useState<Map<string, CartProductInfo> | null>(null);
  const ids = [...new Set(cart.lines.map((l) => l.productId))].sort().join(",");

  useEffect(() => {
    let alive = true;
    describeCartProducts(ids ? ids.split(",") : []).then(
      (rows) => alive && setInfo(new Map(rows.map((r) => [r.id, r]))),
      () => alive && setInfo(new Map()),
    );
    return () => {
      alive = false;
    };
  }, [ids]);

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-ink-muted">{t.bag.empty}</p>
        <ButtonLink href={localePath(locale, "/shop")} variant="secondary">
          {t.bag.continue}
        </ButtonLink>
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-line border-y border-line" aria-busy={!info}>
      {cart.lines.map((line) => {
        const p = info?.get(line.productId);
        const unavailable = info && !p;
        const name = p ? localized(p.name, locale) : "";
        const unit = p ? (p.sale_price_minor ?? p.price_minor) : 0;
        return (
          <li key={line.lineId} className="flex gap-4 py-5">
            <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-image bg-tissue sm:w-24">
              {p?.image_path ? <Image src={productImageUrl(p.image_path)} alt="" fill sizes="96px" className="object-cover" /> : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {p ? (
                <Link href={localePath(locale, `/product/${p.slug}`)} className="font-medium hover:underline">
                  {name}
                </Link>
              ) : (
                <span className="h-5 w-40 rounded bg-tissue" />
              )}
              {unavailable ? <p className="text-sm text-error">{t.product.unavailable}</p> : null}
              {p
                ? p.fields
                    .filter((f) => line.personalization[f.id])
                    .map((f) => {
                      const raw = line.personalization[f.id];
                      const shown = f.type === "select" ? localized(f.options?.find((o) => o.value === raw)?.label, locale) || raw : raw;
                      return (
                        <p key={f.id} className="text-sm text-ink-muted">
                          {localized(f.label, locale)}: <span className="text-ink">{shown}</span>
                        </p>
                      );
                    })
                : null}
              <p className="text-sm text-ink-muted">
                {t.product.quantity}: {line.quantity}
                {p ? ` · ${formatMoney(unit * line.quantity, { currency, locale })}` : ""}
              </p>
              <button
                type="button"
                onClick={() => cartActions.remove(line.lineId)}
                className="mt-1 self-start text-sm underline underline-offset-4"
              >
                {t.bag.remove}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
