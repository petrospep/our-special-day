import { z } from "zod";

export const inviteCodeSchema = z
  .string({
    required_error: "Enter your invitation code.",
    invalid_type_error: "Enter your invitation code.",
  })
  .trim()
  .toLowerCase()
  .regex(/^w-[a-km-np-z2-9]{8,16}$/, "Enter a valid invitation code.");

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

export const rsvpFormSchema = z.object({
  code: inviteCodeSchema,
  fullName: z
    .string({
      required_error: "Enter your full name.",
      invalid_type_error: "Enter your full name.",
    })
    .trim()
    .min(1, "Enter your full name.")
    .max(120, "Full name must be 120 characters or fewer."),
  attending: z.boolean({
    required_error: "Choose whether you will attend.",
    invalid_type_error: "Choose whether you will attend.",
  }),
  guestCount: z.coerce
    .number({
      required_error: "Enter the number of guests.",
      invalid_type_error: "Enter the number of guests.",
    })
    .int("Guest count must be a whole number.")
    .min(1, "Guest count must be at least 1.")
    .max(10, "Guest count must be 10 or fewer."),
  dietaryRequirements: optionalTextSchema(
    1000,
    "Dietary requirements must be 1000 characters or fewer.",
  ),
  notes: optionalTextSchema(1000, "Notes must be 1000 characters or fewer."),
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
