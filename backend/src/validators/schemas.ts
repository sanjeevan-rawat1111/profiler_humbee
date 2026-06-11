import { z } from 'zod';

const mobileNumberField = z.string().trim()
  .min(1, 'Mobile Number is required.')
  .regex(/^[0-9]{10}$/, 'Please enter a valid 10-digit Mobile Number.');

const geoFields = {
  stateId: z.string().trim().uuid('Please select a valid State'),
  districtId: z.string().trim().uuid('Please select a valid District'),
};

export const loginSchema = z.object({
  mobileNumber: mobileNumberField,
  password: z.string()
    .regex(/^(?=.*[A-Z])(?=.*\d).{6,}$/, 'Password must be at least 6 characters, contain 1 uppercase letter and 1 number'),
});

const normalizeOptionalString = (value: unknown) => (value == null ? '' : String(value));

const optionalVcpMobileField = z.preprocess(
  normalizeOptionalString,
  z.string().trim().refine(
    (value) => value === '' || /^[0-9]{10}$/.test(value),
    'Mobile number must be exactly 10 digits when provided',
  ),
);

export const submissionSchema = z.object({
  sapCode: z.string().trim().min(1, 'SAP Code is required'),
  mobileNumber: optionalVcpMobileField.optional().default(''),
  vcpMobile: optionalVcpMobileField.optional(),
}).transform((data) => ({
  sapCode: data.sapCode,
  mobileNumber: data.mobileNumber || data.vcpMobile || '',
}));

const managerRegionFields = {
  assignedRegionIds: z.array(z.string().uuid()).optional().default([]),
};

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  mobileNumber: mobileNumberField,
  password: z.string()
    .regex(/^(?=.*[A-Z])(?=.*\d).{6,}$/, 'Password must be at least 6 characters, contain 1 uppercase letter and 1 number'),
  role: z.enum(['user', 'admin', 'manager']).optional().default('user'),
  stateId: geoFields.stateId.optional(),
  districtId: geoFields.districtId.optional(),
  ...managerRegionFields,
  status: z.enum(['active', 'inactive']).optional().default('active'),
}).superRefine((data, ctx) => {
  if (data.role === 'manager') {
    if (!data.assignedRegionIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Managers must be assigned at least one Region',
        path: ['assignedRegionIds'],
      });
    }
    return;
  }
  if (data.role === 'user' && (!data.stateId || !data.districtId)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'State and District are required',
      path: ['districtId'],
    });
  }
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  mobileNumber: mobileNumberField.optional(),
  password: z.string()
    .regex(/^(?=.*[A-Z])(?=.*\d).{6,}$/, 'Password must be at least 6 characters, contain 1 uppercase letter and 1 number')
    .optional(),
  role: z.enum(['user', 'admin', 'manager']).optional(),
  stateId: geoFields.stateId.optional(),
  districtId: geoFields.districtId.optional(),
  ...managerRegionFields,
  status: z.enum(['active', 'inactive']).optional(),
}).refine(
  (data) => (data.stateId === undefined) === (data.districtId === undefined),
  { message: 'State and District must be updated together', path: ['districtId'] },
);

export const regionSchema = z.object({
  regionName: z.string().trim().min(1, 'Region name is required'),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  stateIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateRegionSchema = z.object({
  regionName: z.string().trim().min(1, 'Region name is required').optional(),
  status: z.enum(['active', 'inactive']).optional(),
  stateIds: z.array(z.string().uuid()).optional(),
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
