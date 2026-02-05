import { z } from 'zod';

export const EnvSchema = z.object({
  SUI_ENV: z.enum(['testnet', 'mainnet']).default('testnet'),
  DEEPBOOK_POOL_KEY: z.string().default('SUI_DBUSDC'),

  BOT_PRIVATE_KEY: z.string().optional(),
  OWNER_PRIVATE_KEY: z.string().optional(),

  BALANCE_MANAGER_ID: z.string().optional(),
  BALANCE_MANAGER_KEY: z.string().default('MANAGER'),
  TRADE_CAP_ID: z.string().optional(),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function loadEnv(): AppEnv {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid env:\n${parsed.error.message}`);
  }
  return parsed.data;
}

export function must<T>(v: T | undefined | null, name: string): T {
  if (v === undefined || v === null || v === '') throw new Error(`Missing ${name}`);
  return v;
}
