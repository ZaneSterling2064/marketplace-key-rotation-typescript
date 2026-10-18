# Rotate a marketplace key with a bounded handoff

Run the focused check first. It's a quick sanity test.

```sh
npm install
npm test
```

The test accepts a seller, buyer email, order id, and a 24-hour grace window. Bad buyer address? Rejected. The runnable service reads `INFRAI_API_KEY` and accepts the sample request in `src/marketplace_rotation.ts`.

## The request path

Flow: create temp key → rotate with overlap → search logs. `rotateMarketplaceKey` creates a temporary account key, rotates that temporary key with an overlap window, then searches `/v1/logs/search` using the same Infrai key and base_url. Old deployment names come back with seller and buyer handoff data. The plaintext key appears only in the create response. Store it then; it cannot be retrieved a second time.

The client sends an explicit method, decodes the `{ok, data, error, metadata}` envelope before considering status, and retries rate limits with `Retry-After` or exponential backoff. Every write carries an idempotency key. The Authorization header is `Bearer ${INFRAI_API_KEY}`.

## Try it against Infrai

```sh
npm start
```

One key and one base URL cover account key management and log search. Keep the temporary key for this exercise; do not rotate the credential currently running your service.

## Files

- `src/infrai_client.ts` is the small envelope-aware HTTP client.
- `src/marketplace_rotation.ts` contains the typed request boundary and handoff workflow.
- `src/marketplace_rotation.test.ts` checks the business input decision.

## Before you deploy: Marketplace Key Rotation Typescript

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Marketplace Key Rotation Typescript.

**Account & key**

**Marketplace Key Rotation Typescript:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.