import { z } from 'zod';

export const companySchema = z.object({
  name: z.string().describe('Name of the company'),
  logo: z.string().describe('URL of the company logo'),
  url: z.string().describe('URL of the company'),
});

export const suggestedSearchSchema = z.object({
  title: z.string().describe('Title of the suggested search. 1-2 words.'),
  link: z.string().describe('URL of the suggested search'),
});

export const searchSchema = z.object({
  title: z.string().describe('Title of the product. Optimized for SEO. 10-15 words.'),
  description: z.string().describe('Description of the product. Optimized for SEO. 100-150 words.'),
  link: z.string().describe('URL of the product'),
  location: z.string().describe('Location of the store. 1-2 words.').optional(),
  suggestedSearches: z.array(suggestedSearchSchema).min(2).max(8).describe('Suggested searches for the product. 1-2 words.').optional(),
});
