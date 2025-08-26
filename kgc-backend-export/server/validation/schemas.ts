import { z } from "zod";

// Common validation patterns
const phoneNumberRegex = /^\+?[1-9]\d{1,14}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// User validation schemas
export const userIdSchema = z.string().or(z.number()).transform(val => {
  const num = typeof val === 'string' ? parseInt(val, 10) : val;
  if (isNaN(num) || num <= 0) {
    throw new Error('Invalid user ID');
  }
  return num;
});

export const phoneNumberSchema = z.string()
  .regex(phoneNumberRegex, 'Invalid phone number format')
  .min(10, 'Phone number too short')
  .max(15, 'Phone number too long');

export const emailSchema = z.string()
  .regex(emailRegex, 'Invalid email format')
  .max(255, 'Email too long');

// Score validation schemas
export const scoreSchema = z.number()
  .int('Score must be an integer')
  .min(1, 'Score must be at least 1')
  .max(10, 'Score must be at most 10');

export const dailyScoresSchema = z.object({
  medicationScore: scoreSchema,
  dietScore: scoreSchema,
  exerciseScore: scoreSchema,
  moodScore: scoreSchema,
  sleepScore: scoreSchema,
  stressScore: scoreSchema,
  painScore: scoreSchema,
  energyScore: scoreSchema,
  sociabilityScore: scoreSchema,
  overallScore: scoreSchema,
  notes: z.string().max(1000, 'Notes too long').optional(),
  date: z.string().datetime().optional()
});

// Care Plan Directive validation
export const carePlanDirectiveSchema = z.object({
  patientId: z.number().int().positive(),
  title: z.string().min(1, 'Title required').max(255, 'Title too long'),
  description: z.string().min(1, 'Description required').max(2000, 'Description too long'),
  category: z.enum(['medication', 'diet', 'exercise', 'lifestyle', 'monitoring']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  targetValue: z.string().max(100, 'Target value too long').optional(),
  frequency: z.string().max(100, 'Frequency too long').optional(),
  isActive: z.boolean().default(true)
});

// Authentication validation
export const loginSchema = z.object({
  phoneNumber: phoneNumberSchema
});

export const verifyCodeSchema = z.object({
  phoneNumber: phoneNumberSchema,
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d{6}$/, 'Code must be numeric')
});

export const adminLoginSchema = z.object({
  adminId: z.string().min(1, 'Admin ID required').max(50, 'Admin ID too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(255, 'Password too long')
});

// Patient creation validation
export const createPatientSchema = z.object({
  name: z.string().min(1, 'Name required').max(255, 'Name too long'),
  email: emailSchema.optional(),
  phoneNumber: phoneNumberSchema,
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  emergencyContact: z.object({
    name: z.string().max(255, 'Emergency contact name too long'),
    phoneNumber: phoneNumberSchema
  }).optional()
});

// Doctor creation validation
export const createDoctorSchema = z.object({
  name: z.string().min(1, 'Name required').max(255, 'Name too long'),
  email: emailSchema,
  phoneNumber: phoneNumberSchema,
  specialization: z.string().max(255, 'Specialization too long').optional(),
  licenseNumber: z.string().max(100, 'License number too long').optional()
});

// Feature usage validation
export const featureUsageSchema = z.object({
  featureName: z.string().min(1, 'Feature name required').max(100, 'Feature name too long'),
  duration: z.number().int().min(0, 'Duration must be non-negative').optional(),
  metadata: z.record(z.any()).optional()
});

// Chat message validation
export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message required').max(2000, 'Message too long'),
  context: z.record(z.any()).optional()
});

// Admin actions validation
export const adminActionSchema = z.object({
  action: z.enum(['create_doctor', 'create_patient', 'deactivate_user', 'assign_patient', 'generate_report']),
  targetId: z.number().int().positive().optional(),
  data: z.record(z.any()).optional()
});

// Pagination validation
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).default('10'),
  sortBy: z.string().max(50, 'Sort field too long').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

// Date range validation
export const dateRangeSchema = z.object({
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format')
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'Start date must be before or equal to end date'
});

// Resource ID validation for IDOR protection
export const resourceIdSchema = z.object({
  id: userIdSchema
});

// Bulk operations validation
export const bulkIdsSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one ID required').max(100, 'Too many IDs')
});

// File upload validation
export const fileUploadSchema = z.object({
  fileName: z.string().min(1, 'File name required').max(255, 'File name too long'),
  fileSize: z.number().int().min(1, 'File size must be positive').max(10 * 1024 * 1024, 'File too large (max 10MB)'),
  fileType: z.string().regex(/^[a-zA-Z0-9\/\-]+$/, 'Invalid file type format')
});

// Emergency alert validation
export const emergencyAlertSchema = z.object({
  message: z.string().min(1, 'Message required').max(500, 'Message too long'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  patientId: z.number().int().positive()
});

// Validation helper functions
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      req.validatedData = schema.parse({
        ...req.body,
        ...req.params,
        ...req.query
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            received: e.received
          }))
        });
      } else {
        next(error);
      }
    }
  };
}

// Sanitization functions
export function sanitizeString(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  return obj;
}