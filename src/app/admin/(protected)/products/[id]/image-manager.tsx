"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, prepareImage } from "@/lib/catalog/prepare-image";
import { productImageUrl } from "@/lib/catalog/images";
import { site } from "@/config/site";
import type { LocalizedText } from "@/i18n/config";
import { deleteImage, registerImage, reorderImages, saveImageAlt } from "./image-actions";
import { useActionForm } from "@/components/admin/use-action-form";
import { Button, buttonClass } from "@/components/ui/button";
import { FormMessage, TextInput } from "@/components/ui/field";
import { adminT, fillAdmin } from "@/messages/admin";

export type AdminImage = { id: string; storage_path: string; alt_text: LocalizedText | null };

export function ImageManager({ productId, images }: { productId: string; images: AdminImage[] }) {
  const t = adminT.images;
  const router = useRouter();
  const inputId = useId();
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [order, setOrder] = useState(images);
  const [busy, startTransition] = useTransition();

  // Keep local order in sync when the server sends new images.
  const serverKey = images.map((i) => i.id).join();
  const [lastKey, setLastKey] = useState(serverKey);
  if (serverKey !== lastKey) {
    setLastKey(serverKey);
    setOrder(images);
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    const problems: string[] = [];
    const supabase = createSupabaseBrowserClient();
    setProgress({ done: 0, total: list.length });

    for (const [i, file] of list.entries()) {
      if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
        problems.push(fillAdmin(t.badType, { name: file.name }));
      } else {
        try {
          const prepared = await prepareImage(file);
          if (prepared.blob.size > MAX_UPLOAD_BYTES) {
            problems.push(fillAdmin(t.tooLarge, { name: file.name }));
          } else {
            const path = `products/${productId}/${crypto.randomUUID()}.${prepared.ext}`;
            const { error } = await supabase.storage
              .from(site.productImagesBucket)
              .upload(path, prepared.blob, { contentType: prepared.blob.type, cacheControl: "31536000", upsert: false });
            const registered = error ? { ok: false } : await registerImage({ productId, path, width: prepared.width, height: prepared.height });
            if (!registered.ok) problems.push(fillAdmin(t.failed, { name: file.name }));
          }
        } catch {
          problems.push(fillAdmin(t.failed, { name: file.name }));
        }
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setErrors(problems);
    setProgress(null);
    router.refresh();
  }

  function move(index: number, delta: number) {
    const next = [...order];
    const [item] = next.splice(index, 1);
    next.splice(Math.max(0, Math.min(next.length, index + delta)), 0, item);
    setOrder(next);
    startTransition(async () => {
      await reorderImages(productId, next.map((i) => i.id));
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!window.confirm(t.removeConfirm)) return;
    setOrder((o) => o.filter((i) => i.id !== id));
    startTransition(async () => {
      await deleteImage(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink-muted">{t.help}</p>
      <div>
        <label htmlFor={inputId} className={buttonClass("secondary", "md", "cursor-pointer")}>
          {progress ? fillAdmin(t.uploading, progress) : t.upload}
        </label>
        <input
          id={inputId}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="sr-only"
          disabled={!!progress}
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <div aria-live="polite">
        {errors.length ? (
          <FormMessage tone="error">
            {errors.map((m) => (
              <span key={m} className="block">
                {m}
              </span>
            ))}
          </FormMessage>
        ) : null}
      </div>

      {order.length === 0 ? (
        <p className="text-ink-muted">{t.empty}</p>
      ) : (
        <ol className="flex flex-col gap-4" aria-busy={busy}>
          {order.map((img, index) => (
            <li key={img.id} className="flex gap-3 rounded-control border border-line p-3">
              <div className="relative aspect-[4/5] w-24 shrink-0 self-start overflow-hidden rounded-image bg-tissue sm:w-32">
                <Image src={productImageUrl(img.storage_path)} alt="" fill sizes="(min-width: 640px) 128px, 96px" className="object-cover" />
                {index === 0 ? (
                  <span className="absolute top-1.5 left-1.5 rounded-pill bg-paper px-2 py-0.5 text-xs font-medium">{t.main}</span>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {index > 0 ? (
                    <Button size="sm" variant="secondary" onClick={() => move(index, -index)} disabled={busy}>
                      {t.makeMain}
                    </Button>
                  ) : null}
                  <Button size="sm" variant="secondary" onClick={() => move(index, -1)} disabled={busy || index === 0} aria-label={adminT.common.moveUp}>
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => move(index, 1)}
                    disabled={busy || index === order.length - 1}
                    aria-label={adminT.common.moveDown}
                  >
                    ↓
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => remove(img.id)} disabled={busy}>
                    {t.remove}
                  </Button>
                </div>
                <AltForm image={img} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function AltForm({ image }: { image: AdminImage }) {
  const t = adminT;
  const { state, pending, formRef, onSubmit } = useActionForm(saveImageAlt);
  const langs = [
    ["en", t.common.english],
    ["mk", t.common.macedonian],
    ["sq", t.common.albanian],
  ] as const;
  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-2">
      <input type="hidden" name="image_id" value={image.id} />
      <p className="text-sm font-medium">{t.images.alt}</p>
      {langs.map(([code, label]) => (
        <div key={code} className="flex items-center gap-2">
          <label htmlFor={`alt-${image.id}-${code}`} className="w-20 shrink-0 text-xs text-ink-muted">
            {label}
          </label>
          <TextInput
            id={`alt-${image.id}-${code}`}
            name={`alt.${code}`}
            lang={code}
            defaultValue={image.alt_text?.[code] ?? ""}
            maxLength={200}
            className="min-h-10 text-sm"
          />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? t.common.saving : t.images.saveAlt}
        </Button>
        {state.message ? (
          <span role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-success" : "text-sm text-error"}>
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
