import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";

export const handoffSchema = z.object({
  seller_id: z.string().min(1),
  buyer_email: z.string().email(),
  order_id: z.string().min(1),
  grace_hours: z.number().int().min(1).max(72)
});
export type HandoffRequest = z.infer<typeof handoffSchema>;

export async function findMarketplaceDeployments(input: HandoffRequest, client = new InfraiClient(process.env.INFRAI_API_KEY ?? "")) {
  const request = handoffSchema.parse(input);
  const temporaryKey = await client.request<{ key_id: string }>("/v1/account/keys/create", "POST", {
    name: `marketplace-handoff-${request.order_id}`,
    scopes: ["logs:read"],
    idempotency_key: `marketplace-handoff-create-${request.order_id}`
  });
  await client.request(`/v1/account/keys/rotate/${encodeURIComponent(temporaryKey.key_id)}`, "POST", {
    grace_hours: request.grace_hours,
    idempotency_key: `marketplace-handoff-rotate-${request.order_id}`
  });
  const logs = await client.request<{ items: Array<{ deployment?: string }> }>(`/v1/logs/search?q=${encodeURIComponent(request.order_id)}`, "GET");
  const oldDeployments = logs.items.map((entry) => entry.deployment).filter(Boolean);
  return {
    seller_id: request.seller_id,
    buyer_email: request.buyer_email,
    order_id: request.order_id,
    temporary_key_id: temporaryKey.key_id,
    old_deployments: oldDeployments
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const payload = { seller_id: "seller-42", buyer_email: "buyer@example.com", order_id: "order-1007", grace_hours: 24 };
  findMarketplaceDeployments(payload).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error); process.exitCode = 1; });
}
