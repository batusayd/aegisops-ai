# Technical Troubleshooting & Platform Runbook (`TECH-KB-2026`)

**Document ID:** `TECH-KB-2026`  
**Effective Date:** February 15, 2026  
**Owner:** Core Platform & Site Reliability Engineering (SRE)  

---

## 1. Enterprise SSO / SAML 2.0 Authentication `500` Error (`TECH-KB-101`)
**Symptom:** Users attempting to sign in via Okta, Azure AD (Entra ID), or Google Workspace SAML receive an `HTTP 500: SAML Assertion Validation Failed` or `InvalidNotOnOrAfter` error.
**Root Cause:** Clock skew between the Identity Provider (IdP) server and our authentication gateway, or an expired X.509 signing certificate after an IdP metadata rotation.
**Resolution Steps:**
1. Navigate to **Settings -> Security -> SSO Configuration** in the Admin Console.
2. Enable **Clock Skew Tolerance (180 seconds)** under Advanced SAML Assertion Settings.
3. Re-upload the latest IdP X.509 `.pem` certificate and verify that the **ACS URL** matches `https://auth.omnihub.ai/v1/saml/acs`.
4. Ensure the `NameID` format is explicitly mapped to `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`.

## 2. Webhook Ingestion Failures & Signature Verification (`TECH-KB-102`)
**Symptom:** Incoming support webhooks return `HTTP 401 Unauthorized: Invalid HMAC Signature` or fail to trigger the triage pipeline.
**Resolution Steps:**
1. Verify that your webhook producer hashes the **raw, unparsed UTF-8 request body** using `HMAC-SHA256` with your workspace's `WEBHOOK_SIGNING_SECRET`.
2. Pass the signature in the `X-Hub-Signature-256` header formatted as `sha256=<hex_digest>`.
3. Check that the `X-Hub-Timestamp` header is within **300 seconds** of UTC server time to prevent replay protection rejection.

## 3. API Rate Limiting & `HTTP 429 Too Many Requests` (`TECH-KB-103`)
**Symptom:** High-volume ingestion scripts receive `HTTP 429` responses with `Retry-After` headers.
**Default Quotas:**
- **Starter / Academic Tier:** 60 requests/minute (burst up to 100).
- **Pro Tier:** 600 requests/minute.
- **Enterprise Tier:** 3,000 requests/minute (customizable via dedicated ingress).
**Mitigation:** Implement exponential backoff with full jitter respecting the `Retry-After` header, or switch bulk historical ticket imports to the `/api/v1/tickets/batch` async endpoint (supports up to 500 tickets per payload).

## 4. Qdrant Vector Sync & Stale RAG Citations (`TECH-KB-104`)
**Symptom:** Updated Markdown or PDF policy documents do not appear in RAG draft citations.
**Resolution Steps:**
1. Trigger an index refresh via `POST /api/kb/ingest` or click **"Re-Index Knowledge Base"** in the Mission Control Dashboard.
2. Confirm chunking parameters: default chunk size is **600 characters with 100-character overlap**, indexed using cosine similarity in the `omnichannel_kb_v1` collection.
