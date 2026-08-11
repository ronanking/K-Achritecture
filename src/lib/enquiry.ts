import { z } from "zod";
import { categories } from "./projects/categories";

/**
 * One schema, used by the form in the browser and by the route on the server.
 * The client cannot submit something the server would reject, and the server
 * never trusts that the client checked.
 */

export const divisionOptions = [
  ...categories.map((c) => ({ value: c.id as string, label: c.title })),
  { value: "other", label: "Something else" },
];

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const enquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please tell us your name.")
    .max(120, "That name is too long."),
  email: z
    .string()
    .trim()
    .min(1, "An email address is required.")
    .max(200)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "That email address looks wrong."),
  phone: optionalText(40),
  division: z
    .string()
    .refine(
      (v) => divisionOptions.some((o) => o.value === v),
      "Choose the kind of project.",
    ),
  location: optionalText(140),
  message: z
    .string()
    .trim()
    .min(20, "A sentence or two about the site and the brief, please.")
    .max(4000, "That is longer than this form can carry — email us directly."),
  /** Honeypot. Real people never see it, so it must arrive empty. */
  company: z.string().max(0).optional(),
});

export type Enquiry = z.infer<typeof enquirySchema>;

export type EnquiryResponse =
  | { ok: true }
  | { ok: false; reason: "invalid"; errors: Record<string, string> }
  | { ok: false; reason: "not-configured" }
  | { ok: false; reason: "failed" }
  | { ok: false; reason: "rate-limited" };

/** Flatten a Zod issue list into one message per field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
