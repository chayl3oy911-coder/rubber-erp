"use client";

import { useEffect, useId, useRef, useState } from "react";

import { purchaseT } from "@/modules/purchase/i18n";

const t = purchaseT();

const REASON_MIN = 5;
const REASON_MAX = 500;

type Props = {
  /**
   * The ticket being cancelled. Passing the whole DTO (or a slim
   * shape) is fine — we only need `ticketNo` for display. Truthy
   * also doubles as the "open" signal, but since the parent uses a
   * `key={ticket.id}` to remount the dialog per open, we keep this
   * prop strictly required.
   */
  ticketNo: string;
  /** Disables every interactive control while the request is in flight. */
  isBusy: boolean;
  /**
   * Called when the user confirms with a valid reason. The trimmed
   * reason is passed verbatim — the parent owns the API call. We
   * never close the dialog ourselves: the parent decides whether to
   * close based on the API response (success → close, error → keep
   * open so the user can retry without losing what they typed).
   */
  onConfirm: (reason: string) => void;
  /** Called when the user dismisses the dialog (close, ESC, backdrop). */
  onClose: () => void;
};

/**
 * Modal cancel dialog used by the /purchases list page.
 *
 * Why a dedicated component (and not the inline panel from the detail
 * page):
 *
 *   - The detail page uses a `<form action={serverAction}>` panel that
 *     redirects on submit; the list page must keep the user on /purchases
 *     and only update one row. Different submit semantics → different
 *     component.
 *   - List actions need a confirmation surface that doesn't push other
 *     rows around. A modal (focus + backdrop) keeps the table layout
 *     stable and visually communicates the destructive intent.
 *
 * Implementation notes:
 *
 *   - We deliberately don't use the native `<dialog>` element. Safari
 *     and Firefox have known quirks around focus restoration when the
 *     dialog contains a textarea inside a portal-less subtree, and the
 *     component needs to compose with our existing toast portal. A
 *     plain `role="dialog"` + `aria-modal` div is enough for our use.
 *
 *   - Focus management is intentionally minimal: we focus the textarea
 *     on open (so users start typing immediately) and rely on browser
 *     default tab order for the two action buttons. A full focus trap
 *     would require pulling in a library or writing 60+ LOC of edge-
 *     case handling — overkill for a two-control dialog.
 *
 *   - Body scroll lock: enabling it with `overflow:hidden` on `<body>`
 *     for the lifetime of the dialog. Cleanup is via the effect's
 *     return function so the lock is always released, even if the
 *     parent unmounts the dialog mid-request.
 */
export function CancelPurchaseDialog({
  ticketNo,
  isBusy,
  onConfirm,
  onClose,
}: Props) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();

  // Auto-focus + ESC + body scroll lock — all in one effect because
  // they share the same lifetime (mount → unmount of this dialog).
  useEffect(() => {
    textareaRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isBusy) {
        event.preventDefault();
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isBusy, onClose]);

  const trimmed = reason.trim();
  const tooShort = trimmed.length < REASON_MIN;
  const showError = touched && tooShort;
  const confirmDisabled = isBusy || tooShort;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (confirmDisabled) {
      // Revealing the error here covers the keyboard "submit on Enter"
      // case — the user gets feedback even without the textarea blur.
      setTouched(true);
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <div
      role="presentation"
      // Backdrop click closes when not busy. Stop propagation on the
      // inner panel so clicks inside the dialog don't bubble up to
      // the backdrop and dismiss it accidentally.
      onMouseDown={() => {
        if (!isBusy) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 p-5"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <h2
              id={titleId}
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {t.misc.cancelDialogTitle}
            </h2>
            <p
              id={descriptionId}
              className="text-sm text-zinc-600 dark:text-zinc-400"
            >
              {t.misc.cancelDialogPrompt(ticketNo)}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${titleId}-reason`}
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              {t.misc.cancelDialogReasonLabel}
              <span className="text-red-600"> *</span>
            </label>
            <textarea
              id={`${titleId}-reason`}
              ref={textareaRef}
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              onBlur={() => setTouched(true)}
              disabled={isBusy}
              maxLength={REASON_MAX}
              placeholder={t.misc.cancelDialogReasonPlaceholder}
              aria-invalid={showError}
              aria-describedby={showError ? errorId : undefined}
              className={`w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 dark:text-zinc-50 ${
                showError
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/60"
                  : "border-zinc-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-zinc-700"
              }`}
            />
            {showError ? (
              <p
                id={errorId}
                className="text-xs font-medium text-red-600 dark:text-red-400"
              >
                {t.misc.cancelDialogReasonTooShort}
              </p>
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t.misc.cancelDialogReasonHint}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {t.misc.cancelDialogClose}
            </button>
            <button
              type="submit"
              disabled={confirmDisabled}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t.misc.cancelDialogConfirm}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
