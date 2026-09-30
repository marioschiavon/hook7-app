// Preços do plano API — fonte: docs/planos-e-precos.md no repositório do site (Hook7).
// A cobrança continua sendo por sessão (1 sessão = 1 número = 1 assinatura no Stripe).
// A primeira sessão paga da organização usa o preço do plano; as demais, o de número adicional.
// Precisa ficar igual a supabase/functions/create-stripe-checkout/index.ts.

export type BillingCycle = "monthly" | "annual";
export type PlanKey = "api_monthly" | "api_annual" | "extra_monthly" | "extra_annual";

/** Anual: paga 10 meses, leva 12. */
export const ANNUAL_MONTHS_CHARGED = 10;

export const PLAN_PRICES: Record<PlanKey, number> = {
  api_monthly: 59.9,
  api_annual: 599.0,
  extra_monthly: 39.9,
  extra_annual: 399.0,
};

export function planKeyFor(isExtraNumber: boolean, cycle: BillingCycle): PlanKey {
  return `${isExtraNumber ? "extra" : "api"}_${cycle}` as PlanKey;
}

export function isAnnualPlan(planName?: string | null): boolean {
  return !!planName && planName.endsWith("_annual");
}

/** Valor equivalente por mês (anual dividido por 12). */
export function monthlyEquivalent(amount: number, planName?: string | null): number {
  return isAnnualPlan(planName) ? amount / 12 : amount;
}

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
