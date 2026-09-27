import assert from "node:assert/strict";
import { findMarketplaceDeployments, handoffSchema } from "./marketplace_rotation.ts";
import { InfraiClient } from "./infrai_client.ts";

const parsed = handoffSchema.safeParse({ seller_id: "seller-1", buyer_email: "buyer@example.com", order_id: "order-1", grace_hours: 24 });
assert.equal(parsed.success, true);
const rejected = handoffSchema.safeParse({ seller_id: "seller-1", buyer_email: "not-an-email", order_id: "order-1", grace_hours: 24 });
assert.equal(rejected.success, false);
const calls: Array<{ path: string; method: string; body?: unknown }> = [];
const client = {
  request: async (path: string, method: string, body?: unknown) => {
    calls.push({ path, method, body });
    if (path === "/v1/account/keys/create") return { key_id: "temporary-key-1" };
    if (path.startsWith("/v1/account/keys/rotate/")) return { key_id: "temporary-key-1" };
    return { items: [{ deployment: "previous-deployment" }] };
  }
} as InfraiClient;
const result = await findMarketplaceDeployments(parsed.data!, client);
assert.deepEqual(calls, [
  {
    path: "/v1/account/keys/create",
    method: "POST",
    body: {
      name: "marketplace-handoff-order-1",
      scopes: ["logs:read"],
      idempotency_key: "marketplace-handoff-create-order-1"
    }
  },
  {
    path: "/v1/account/keys/rotate/temporary-key-1",
    method: "POST",
    body: { grace_hours: 24, idempotency_key: "marketplace-handoff-rotate-order-1" }
  },
  { path: "/v1/logs/search?q=order-1", method: "GET", body: undefined }
]);
assert.deepEqual(result.old_deployments, ["previous-deployment"]);
console.log("handoff request validation passed");
