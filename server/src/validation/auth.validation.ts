import { z } from "zod";
import { SECRET_QUESTIONS_COUNT } from "../constants/secretQuestions.js";

export const strongPasswordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .max(100, "Le mot de passe est trop long")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Le mot de passe doit contenir au moins un caractère spécial");

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20),
  password: strongPasswordSchema,
  /** Format `YYYY-MM-DD` (jour civil). */
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de naissance invalide (AAAA-MM-JJ)"),
  secretQuestionId: z.coerce
    .number()
    .int()
    .min(1)
    .max(SECRET_QUESTIONS_COUNT),
  secretAnswer: z.string().min(2).max(200),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  secretAnswer: z.string().min(1).max(200),
  newPassword: strongPasswordSchema,
});
