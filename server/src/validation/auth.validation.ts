import { z } from "zod";
import { SECRET_QUESTIONS_COUNT } from "../constants/secretQuestions.js";

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20),
  password: z.string().min(6).max(100),
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
  newPassword: z.string().min(6).max(100),
});