"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  divisionOptions,
  enquirySchema,
  fieldErrors,
  type EnquiryResponse,
} from "@/lib/enquiry";
import { site } from "@/lib/site";

/**
 * The enquiry.
 *
 * Fields are rules, not boxes — the same hairline the rest of the site is set
 * out on, thickening to oxide when focused. Labels are always visible; nothing
 * here depends on placeholder text a screen reader has to guess at.
 *
 * If transactional email has not been connected yet, the form does not pretend
 * to have sent anything: it hands the visitor a prepared message addressed to
 * the studio instead.
 */

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "fallback"; mailto: string }
  | { kind: "error"; message: string };

export function EnquiryForm() {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const startedAt = useRef(0);

  // Stamped after mount rather than during render, and used only to reject
  // submissions that arrive faster than a person could have typed them.
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));

    const parsed = enquirySchema.safeParse(data);
    if (!parsed.success) {
      const next = fieldErrors(parsed.error);
      setErrors(next);
      setStatus({ kind: "idle" });
      // Move the reader to the first thing that needs attention.
      const first = Object.keys(next)[0];
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${first}"]`)
        ?.focus();
      return;
    }

    // A genuine enquiry takes longer than three seconds to write.
    if (startedAt.current && Date.now() - startedAt.current < 3000) {
      setStatus({ kind: "error", message: "That was too quick — try again." });
      return;
    }

    setErrors({});
    setStatus({ kind: "sending" });

    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = (await res.json()) as EnquiryResponse;

      if (result.ok) {
        setStatus({ kind: "sent" });
        return;
      }

      if (result.reason === "invalid") {
        setErrors(result.errors);
        setStatus({ kind: "idle" });
        return;
      }

      if (result.reason === "rate-limited") {
        setStatus({
          kind: "error",
          message: "Several enquiries have come from here already. Please email us directly.",
        });
        return;
      }

      // Not configured, or delivery failed: hand over a prepared email.
      const { name, email, phone, division, location, message } = parsed.data;
      const body = [
        `Name: ${name}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : null,
        `Project: ${division}`,
        location ? `Location: ${location}` : null,
        "",
        message,
      ]
        .filter(Boolean)
        .join("\n");

      setStatus({
        kind: "fallback",
        mailto: `mailto:${site.email}?subject=${encodeURIComponent(
          `Enquiry — ${name}`,
        )}&body=${encodeURIComponent(body)}`,
      });
    } catch {
      setStatus({
        kind: "error",
        message: "The enquiry could not be sent. Please email the studio directly.",
      });
    }
  }

  if (status.kind === "sent") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        role="status"
      >
        <div aria-hidden className="mb-8 h-px w-full bg-current opacity-25" />
        <p className="display-tight text-h3">Received.</p>
        <p className="prose-k mt-5 max-w-[42ch] opacity-70">
          Thank you — the studio will be in touch. If it is urgent, call{" "}
          <a className="underline underline-offset-4" href={`tel:${site.phoneHref}`}>
            {site.phone}
          </a>
          .
        </p>
      </motion.div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="space-y-9"
      aria-describedby={`${formId}-status`}
    >
      <div className="grid gap-9 sm:grid-cols-2">
        <Field
          name="name"
          label="Name"
          autoComplete="name"
          required
          error={errors.name}
        />
        <Field
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          error={errors.email}
        />
        <Field
          name="phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          optional
          error={errors.phone}
        />
        <SelectField
          name="division"
          label="Kind of project"
          required
          error={errors.division}
        />
      </div>

      <Field
        name="location"
        label="Site or suburb"
        optional
        error={errors.location}
      />

      <Field
        name="message"
        label="The brief"
        as="textarea"
        rows={5}
        required
        error={errors.message}
        hint="What is there now, what you would like, and roughly when."
      />

      {/* Honeypot. Off-screen, not hidden, so assistive tech can skip it. */}
      <div className="sr-only-k" aria-hidden>
        <label htmlFor={`${formId}-company`}>Company</label>
        <input
          id={`${formId}-company`}
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="rule-t flex flex-wrap items-center justify-between gap-6 pt-7">
        <button
          type="submit"
          disabled={status.kind === "sending"}
          className="group inline-flex items-baseline gap-4 disabled:opacity-50"
        >
          <span className="text-h4">
            {status.kind === "sending" ? "Sending" : "Send enquiry"}
          </span>
          <span
            aria-hidden
            className="block h-px w-14 origin-left bg-current transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-150 group-focus-visible:scale-x-150"
          />
        </button>

        <p className="note max-w-[30ch] opacity-45">
          Or email{" "}
          <a className="underline underline-offset-4" href={`mailto:${site.email}`}>
            {site.email}
          </a>
        </p>
      </div>

      <div id={`${formId}-status`} aria-live="polite">
        <AnimatePresence>
          {status.kind === "fallback" ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-body"
            >
              Automatic delivery is not connected on this deployment yet.{" "}
              <a
                className="text-oxide underline underline-offset-4"
                href={status.mailto}
              >
                Send this enquiry from your own email
              </a>{" "}
              — everything you typed is already in it.
            </motion.p>
          ) : null}

          {status.kind === "error" ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-body text-oxide"
            >
              {status.message}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function Field({
  name,
  label,
  error,
  hint,
  optional = false,
  as = "input",
  rows,
  ...rest
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  as?: "input" | "textarea";
  rows?: number;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  const shared = {
    id,
    name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
    className:
      "peer w-full border-0 border-b bg-transparent pb-2 pt-1 text-body outline-none transition-colors duration-300 placeholder:opacity-0 focus:border-oxide " +
      (error ? "border-oxide" : "border-current/25 focus:border-oxide"),
  };

  return (
    <div>
      <label htmlFor={id} className="note mb-3 flex items-baseline gap-2 opacity-55">
        <span>{label}</span>
        {optional ? <span className="opacity-60">Optional</span> : null}
      </label>

      {as === "textarea" ? (
        <textarea {...shared} rows={rows ?? 4} className={`${shared.className} resize-y`} />
      ) : (
        <input {...shared} {...rest} />
      )}

      {hint ? (
        <p id={`${id}-hint`} className="note mt-3 opacity-40">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="note mt-3 text-oxide">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SelectField({
  name,
  label,
  error,
  required,
}: {
  name: string;
  label: string;
  error?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="note mb-3 block opacity-55">
        {label}
      </label>
      <select
        id={id}
        name={name}
        required={required}
        defaultValue=""
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full appearance-none border-0 border-b bg-transparent pb-2 pt-1 text-body outline-none transition-colors duration-300 focus:border-oxide ${
          error ? "border-oxide" : "border-current/25"
        }`}
      >
        <option value="" disabled>
          Select
        </option>
        {divisionOptions.map((o) => (
          <option key={o.value} value={o.value} className="bg-paper text-ink">
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${id}-error`} className="note mt-3 text-oxide">
          {error}
        </p>
      ) : null}
    </div>
  );
}
