/**
 * API リクエストの zod バリデーションスキーマ。
 */

import { z } from "zod";

/** GET /api/cities/search のクエリパラメータ */
export const citySearchSchema = z.object({
  q: z.string().min(2, "検索クエリは2文字以上必要です"),
});

/** POST /api/reports のリクエストボディ */
export const createReportSchema = z.object({
  cities: z
    .array(z.string().min(1, "都市名は空にできません"))
    .min(2, "2都市以上を指定してください")
    .max(5, "5都市以下にしてください"),
  preset: z.enum(["childcare", "price", "safety"], {
    message: "preset は childcare, price, safety のいずれかです",
  }),
  options: z
    .object({
      includePrice: z.boolean().default(true),
      includeCrime: z.boolean().default(true),
      includeDisaster: z.boolean().default(true),
      includeEducation: z.boolean().default(true),
      includeHealthcare: z.boolean().default(true),
    })
    .optional(),
});

/** GET /api/reports/[id] のパスパラメータ */
export const reportIdSchema = z.object({
  id: z.string().uuid("レポートIDが無効です"),
});

/** POST /api/stripe/checkout のリクエストボディ */
export const checkoutSchema = z.object({
  priceId: z.string().min(1, "priceId は必須です"),
});

export type CitySearchInput = z.infer<typeof citySearchSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ReportIdInput = z.infer<typeof reportIdSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
