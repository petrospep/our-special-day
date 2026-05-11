import { z } from "zod";

import { isValidInviteCode } from "../../supabase/functions/_shared/invite-code-word-pool";

export const inviteCodeSchema = z
  .string({
    required_error: "Enter your invitation code.",
    invalid_type_error: "Enter your invitation code.",
  })
  .trim()
  .toLowerCase()
  .refine(isValidInviteCode, "Enter a valid invitation code.");

const optionalTextSchema = (maxLength: number, message: string) =>
  z.preprocess(
    (value) => (value === null ? undefined : value),
    z
      .string({
        invalid_type_error: message,
      })
      .trim()
      .max(maxLength, message)
      .optional()
      .transform((value) => (value === "" ? undefined : value)),
  );

const requiredNameSchema = (field: string) =>
  z
    .string({
      required_error: `Enter ${field}.`,
      invalid_type_error: `Enter ${field}.`,
    })
    .trim()
    .min(1, `Enter ${field}.`)
    .max(80, `${field} must be 80 characters or fewer.`);

const optionalEmailSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z
    .string({
      invalid_type_error: "Enter a valid email address.",
    })
    .trim()
    .email("Enter a valid email address.")
    .max(254, "Email must be 254 characters or fewer.")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value === "" ? undefined : value)),
);

const optionalPhoneSchema = optionalTextSchema(40, "Phone number must be 40 characters or fewer.");

const ageSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce
    .number({
      invalid_type_error: "Enter an age.",
    })
    .int("Age must be a whole number.")
    .min(0, "Age must be between 0 and 12.")
    .max(12, "Age must be between 0 and 12.")
    .optional(),
);

export const rsvpGuestSchema = z
  .object({
    firstName: requiredNameSchema("first name"),
    lastName: requiredNameSchema("last name"),
    under13: z.boolean().default(false),
    age: ageSchema,
  })
  .superRefine((guest, context) => {
    if (guest.under13 && guest.age === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["age"],
        message: "Enter the guest's age.",
      });
    }
  })
  .transform((guest) => ({
    ...guest,
    age: guest.under13 ? guest.age : undefined,
  }));

const rsvpSubmitterSchema = z.object({
  firstName: requiredNameSchema("first name"),
  lastName: requiredNameSchema("last name"),
});

export const rsvpFormSchema = z.object({
  code: inviteCodeSchema,
  submitter: rsvpSubmitterSchema,
  guests: z.array(rsvpGuestSchema).max(9, "Guest count must be 10 or fewer."),
  attendanceStatus: z.enum(["attending", "declined", "maybe"], {
    required_error: "Choose whether you will attend.",
    invalid_type_error: "Choose whether you will attend.",
  }),
  email: optionalEmailSchema,
  phoneNumber: optionalPhoneSchema,
});

export const generateInviteSchema = z.object({
  notes: optionalTextSchema(1000, "Notes must be 1000 characters or fewer."),
});

export const disableInviteSchema = z.object({
  code: inviteCodeSchema,
});

export type InviteCodeInput = z.infer<typeof inviteCodeSchema>;
export type RsvpFormInput = z.infer<typeof rsvpFormSchema>;
export type GenerateInviteInput = z.infer<typeof generateInviteSchema>;
export type DisableInviteInput = z.infer<typeof disableInviteSchema>;
