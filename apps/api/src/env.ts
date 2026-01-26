import { z } from "zod";

const envSchema = z.object({
  INGEST_TOKEN: z.string().min(1).optional(),
  INTERNAL_API_KEY: z.string().min(1).default("dev-internal-key"),
  API_PORT: z.coerce.number().int().positive().default(3001),

  PIPELINE_TOKEN: z.string().optional(),

  DATABASE_URL: z.string().min(1),
  DATABASE_DIRECT_URL: z.string().optional(),
  PRISMA_MIGRATE_ON_START: z
    .preprocess((v) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "string") {
        const normalized = v.toLowerCase();
        if (["1", "true", "yes", "on"].includes(normalized)) return true;
        if (["0", "false", "no", "off"].includes(normalized)) return false;
      }
      return undefined;
    }, z.boolean().optional())
    .default(false),

  STORAGE_PROVIDER: z.enum(["local", "gcs"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("storage/local"),
  STORAGE_BUCKET: z.string().optional(),

  INSIGHTS_ENABLED: z
    .preprocess((v) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "string") return v.toLowerCase() === "true";
      return undefined;
    }, z.boolean().optional())
    .default(false),
  OPENAI_API_KEY: z.string().optional(),
  INSIGHTS_MODEL: z.string().optional(),
  TINKER_MODEL_PATH: z.string().optional().default("tinker://1bdf299a-25aa-5110-877d-9ce6c42f64af:train:0/sampler_weights/insights-agent-model"),
  TINKER_BRIDGE_CMD: z.string().optional().default("python3")

})
  .refine(
    (v) => (v.STORAGE_PROVIDER === "gcs" ? typeof v.STORAGE_BUCKET === "string" && v.STORAGE_BUCKET.length > 0 : true),
    {
      message: "STORAGE_BUCKET is required when STORAGE_PROVIDER=gcs",
      path: ["STORAGE_BUCKET"]
    }
  );

export type Env = z.infer<typeof envSchema>;

export function loadEnv(processEnv: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(processEnv);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${message}`);
  }
  return parsed.data;
}
