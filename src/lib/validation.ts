import { z } from 'zod';

const safeText = (max: number) =>
  z.string().max(max).transform(s => s.trim()).pipe(z.string().min(1));

export const waitlistSchema = z.object({
  firstName: safeText(50),
  lastName: safeText(50),
  email: z.string().email().max(255).toLowerCase(),
  city: z.enum(['Lagos','Abuja','Kano','Kaduna','Port Harcourt','Ibadan','Maiduguri','Sokoto','Zaria','Other']),
  industry: z.enum(['Tech & Software','Halal Finance','Healthcare','Creative Arts','Education','Law & Policy','Entrepreneurship','Architecture','Media & Journalism','NGO & Nonprofit','Other']),
});

export const signupSchema = z.object({
  full_name: safeText(100),
  email: z.string().email().max(255).toLowerCase(),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'At least one uppercase letter')
    .regex(/[0-9]/, 'At least one number')
    .regex(/[^A-Za-z0-9]/, 'At least one special character'),
  industry: z.string().max(100),
  industry_custom: z.string().max(100).optional(),
  career_stage: z.enum(['Student','Early Career','Mid-Level','Senior','Executive','Entrepreneur']),
  city: z.enum(['Lagos','Abuja','Kano','Kaduna','Port Harcourt','Ibadan','Maiduguri','Sokoto','Zaria','Other']),
  country: z.literal('Nigeria'),
  plan: z.enum(['free','pro']),
});

export const loginSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(1).max(255),
});

export const postSchema = z.object({
  content: safeText(2000),
  community_id: z.string().uuid().optional().nullable(),
});

export const messageSchema = z.object({
  content: safeText(1000),
  receiver_id: z.string().uuid(),
});

export const jobSchema = z.object({
  title: safeText(150),
  company: safeText(150),
  description: safeText(5000),
  industry: z.string().max(100),
  location: safeText(200),
  is_remote: z.boolean(),
  job_type: z.enum(['Full-time','Part-time','Contract','Internship','Hybrid']),
  career_stage: z.string().max(50),
  salary_range: z.string().max(100).optional(),
  halal_confirmed: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm this opportunity is halal-compliant' }),
  }),
});

export const profileUpdateSchema = z.object({
  full_name: safeText(100).optional(),
  bio: z.string().max(1000).optional(),
  city: z.enum(['Lagos','Abuja','Kano','Kaduna','Port Harcourt','Ibadan','Maiduguri','Sokoto','Zaria','Other']).optional(),
  skills: z.array(z.string().max(50)).max(20).optional(),
  open_to_opportunities: z.boolean().optional(),
  show_photo: z.boolean().optional(),
});

export const mentorshipRequestSchema = z.object({
  mentor_id: z.string().uuid(),
  message: safeText(500),
});

export const passwordResetSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
});
