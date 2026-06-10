import { z } from 'zod';

const mobileNumberField = z.string().trim()
  .min(1, 'Mobile Number is required.')
  .regex(/^[0-9]{10}$/, 'Please enter a valid 10-digit Mobile Number.');

export const loginSchema = z.object({
  mobileNumber: mobileNumberField,
  password: z.string()
    .regex(/^(?=.*[A-Z])(?=.*\d).{6,}$/, 'Password must be at least 6 characters, contain 1 uppercase letter and 1 number'),
});

export const submissionSchema = z.object({
  sapCode: z.string().trim().min(1, 'SAP Code is required'),
  mobileNumber: z.string().trim().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
});

export const createUserSchema = z.object({
  mobileNumber: mobileNumberField,
  password: z.string()
    .regex(/^(?=.*[A-Z])(?=.*\d).{6,}$/, 'Password must be at least 6 characters, contain 1 uppercase letter and 1 number'),
  role: z.enum(['user', 'admin']).optional().default('user'),
  region: z.string().trim().min(1, 'Region is required'),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const updateUserSchema = z.object({
  mobileNumber: mobileNumberField.optional(),
  password: z.string()
    .regex(/^(?=.*[A-Z])(?=.*\d).{6,}$/, 'Password must be at least 6 characters, contain 1 uppercase letter and 1 number')
    .optional(),
  role: z.enum(['user', 'admin']).optional(),
  region: z.string().trim().min(1).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const submissionsQuerySchema = z.object({
  sapCode: z.string().optional(),
  mobile: z.string().optional(),
  mobileNumber: z.string().optional(),
  user: z.string().optional(),
  date: z.string().optional(),
  page: z.string().optional().transform(v => v ? parseInt(v, 10) : 1),
  limit: z.string().optional().transform(v => v ? parseInt(v, 10) : 20),
  sort: z.enum(['asc', 'desc']).optional().default('desc'),
});
