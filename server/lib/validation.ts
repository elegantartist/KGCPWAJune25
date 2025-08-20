import * as z from "zod";

// Search schema for validating search parameters
export const searchSchema = z.object({
  location: z.string().min(1, "Location is required"),
  type: z.string().optional(),
  postcode: z.string().regex(/^\d{4}$/, "Postcode must be 4 digits").optional(),
  useLocalSearch: z.boolean().optional().default(true),
});

export type SearchParams = z.infer<typeof searchSchema>;