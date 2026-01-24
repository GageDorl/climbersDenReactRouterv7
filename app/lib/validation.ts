import { z } from 'zod';

// User validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z
    .string()
    .trim()
    .min(3, 'Display name must be at least 3 characters')
    .max(30, 'Display name must be 30 characters or fewer')
    .regex(/^[a-zA-Z0-9_]+$/, 'Use letters, numbers, or underscores only (no spaces)'),
});

export const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const profileSetupSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(3, 'Display name must be at least 3 characters')
    .max(30, 'Display name must be 30 characters or fewer')
    .regex(/^[a-zA-Z0-9_]+$/, 'Use letters, numbers, or underscores only (no spaces)')
    .optional(),
  bio: z.string().max(500).optional(),
  climbingStyles: z.array(z.enum(['bouldering', 'sport', 'trad', 'mixed'])),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  profilePhotoUrl: z.string().url().optional(),
});

// Post validation schemas
export const createPostSchema = z.object({
  textContent: z.string().max(2000).optional(),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
}).refine(
  (data) => data.textContent || (data.mediaUrls && data.mediaUrls.length > 0),
  { message: 'Post must have either text content or media' }
);

// Message validation schemas
export const sendMessageSchema = z.object({
  recipientId: z.string().uuid(),
  textContent: z.string().max(2000).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
}).refine(
  (data) => data.textContent || (data.mediaUrls && data.mediaUrls.length > 0),
  { message: 'Message must have either text content or media' }
);

// Tick validation schemas
export const createTickSchema = z.object({
  routeId: z.string().uuid(),
  date: z.coerce.date().refine((date) => date <= new Date(), {
    message: 'Tick date cannot be in the future',
  }),
  sendStyle: z.enum(['redpoint', 'flash', 'onsight', 'project', 'toprope', 'follow']),
  attempts: z.number().int().positive().optional(),
  personalNotes: z.string().max(1000).optional(),
});

// Route rating validation
export const rateRouteSchema = z.object({
  routeId: z.string().uuid(),
  starRating: z.number().int().min(1).max(5),
});

// Journal validation schemas
export const createJournalSchema = z.object({
  title: z.string().min(1).max(200),
  textContent: z.string().max(5000),
  tags: z.array(z.string()).optional(),
  location: z.string().optional(),
  mediaUrls: z.array(z.string().url()).optional(),
});

// Gear list validation schemas
export const createGearListSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  tripDate: z.coerce.date().optional(),
  participantIds: z.array(z.string().uuid()),
});

export const addGearItemSchema = z.object({
  gearListId: z.string().uuid(),
  itemName: z.string().min(1).max(200),
  quantityNeeded: z.number().int().min(1),
  notes: z.string().max(500).optional(),
});

// Crag/Route submission schemas
export const submitCragSchema = z.object({
  name: z.string().min(1).max(200),
  location: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  description: z.string().optional(),
  elevation: z.number().int().optional(),
  approachDescription: z.string().optional(),
});

export const submitRouteSchema = z.object({
  parentCragId: z.string().uuid(),
  name: z.string().min(1).max(200),
  type: z.enum(['sport', 'trad', 'boulder', 'mixed']),
  grade: z.string().max(20),
  pitchCount: z.number().int().min(1).default(1),
  length: z.number().int().optional(),
  description: z.string().optional(),
});

// Location validation
export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationCity: z.string().optional(),
  locationPermissionGranted: z.boolean(),
});
