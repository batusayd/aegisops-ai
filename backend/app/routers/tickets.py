from typing import Any, Dict, List, Literal, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse
import jwt

from app.models.schemas import (
    DispatchedEmailRecord,
    ThresholdUpdateRequest,
    TicketRecord,
    TicketReviewRequest,
    TicketState,
    TicketWebhookPayload,
)
from app.services.hitl_engine import hitl_engine

router = APIRouter(prefix="/api/tickets", tags=["Workflow A — Support Triage & HITL"])

# Curated Demo Scenarios for One-Click Live Video Demonstration
DEMO_TICKET_SCENARIOS: Dict[str, TicketWebhookPayload] = {
    "duplicate_billing": TicketWebhookPayload(
        customer_name="Elena Rostova",
        customer_email="elena.rostova@fintech-cloud.io",
        subject="Charged twice ($49.00 x 2) on Invoice #INV-2026-8841",
        body=(
            "Hi Support Team, our corporate Stripe card was billed twice ($49.00 USD and another $49.00 USD "
            "three seconds later) when upgrading our Pro workspace today. Can you please refund the duplicate "
            "charge immediately and confirm if we qualify for the duplicate billing credit?"
        ),
        channel="DEMO_SIMULATOR",
        metadata={"scenario": "duplicate_billing", "expected_policy": "POL-REF-2026#SEC-2.1"},
    ),
    "high_value_escalation": TicketWebhookPayload(
        customer_name="Marcus Vance (VP Engineering)",
        customer_email="m.vance@apex-enterprise.com",
        subject="URGENT: Demand $1,450.00 Refund & SLA Credit or Immediate Chargeback",
        body=(
            "This is unacceptable. We experienced 4 hours of regional gateway degradation last week and want an "
            "immediate $1,450.00 USD refund including our custom on-premise solutions engineering fee. If this is "
            "not approved today, our legal and finance team will initiate a corporate chargeback dispute."
        ),
        channel="DEMO_SIMULATOR",
        metadata={"scenario": "high_value_escalation", "expected_policy": "POL-REF-2026#SEC-4.2"},
    ),
    "enterprise_saml_500": TicketWebhookPayload(
        customer_name="Kamil Nowak (Cloud Architect)",
        customer_email="k.nowak@aurora-bank.eu",
        subject="Production SSO Outage: HTTP 500 SAML Assertion Validation Failed on Okta",
        body=(
            "All engineers trying to sign in via Okta SAML 2.0 are hitting 'HTTP 500: SAML Assertion Validation "
            "Failed (InvalidNotOnOrAfter)' right after we rotated our X.509 signing certificate. What is the exact "
            "ACS URL, NameID format, and clock-skew setting needed to restore access?"
        ),
        channel="DEMO_SIMULATOR",
        metadata={"scenario": "enterprise_saml_500", "expected_policy": "TECH-KB-101"},
    ),
    "academic_retroactive_refund": TicketWebhookPayload(
        customer_name="Zeynep Kaya (PhD Researcher)",
        customer_email="zeynep.kaya@itu.edu.tr",
        subject="Student .edu.tr Verification & Retroactive Refund for $49 Pro Charge",
        body=(
            "Hello! I am a PhD researcher in NLP at Istanbul Technical University (zeynep.kaya@itu.edu.tr). "
            "I accidentally subscribed at the $49.00/month commercial rate 5 days ago before verifying my .edu.tr "
            "academic email. Can you switch me to the $9.80/month Academic Pro plan, activate the $100 compute "
            "credits, and refund the $39.20 difference?"
        ),
        channel="DEMO_SIMULATOR",
        metadata={"scenario": "academic_retroactive_refund", "expected_policy": "EDU-FAQ-04"},
    ),
}


@router.post("/webhook", response_model=TicketRecord)
async def ingest_ticket_webhook(payload: TicketWebhookPayload) -> TicketRecord:
    """
    Ingests an incoming support email/ticket via Webhook, classifies intent/urgency using the Fast Router LLM,
    retrieves cited policy chunks from Qdrant Vector DB, drafts a response with the Reasoning LLM,
    and routes through the Smart HITL Approval Engine.
    """
    return await hitl_engine.ingest_and_process_ticket(payload)


@router.get("", response_model=List[TicketRecord])
async def list_tickets(state: Optional[TicketState] = None) -> List[TicketRecord]:
    """Returns all support tickets ordered newest first, optionally filtered by HITL state."""
    return hitl_engine.list_tickets(state=state)


@router.get("/dispatched", response_model=List[DispatchedEmailRecord])
async def list_dispatched_emails() -> List[DispatchedEmailRecord]:
    """Returns the audit log of all approved and dispatched outbound support emails."""
    return hitl_engine.dispatched_emails


@router.get("/action")
async def execute_magic_link_get(
    token: str = Query(..., description="Signed HMAC-SHA256 JWT action token"),
    format: Literal["json", "html"] = Query(default="json"),
):
    """
    One-Click Cryptographic Magic-Link Handler (`GET /api/tickets/action?token=...`).
    Allows an operator to approve or reject a pending draft with a single signed link click.
    """
    try:
        ticket, action = await hitl_engine.execute_magic_link_token(token)
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Magic-link action token has expired.") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid cryptographic token signature: {exc}") from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if format == "html":
        badge_color = "#10b981" if action == "APPROVE" else "#ef4444"
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8" />
            <title>HITL Magic-Link Action Verified</title>
            <style>
                body {{ background: #090d16; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
                .card {{ background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px; max-width: 520px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }}
                .badge {{ display: inline-block; padding: 6px 12px; border-radius: 999px; background: {badge_color}22; color: {badge_color}; border: 1px solid {badge_color}; font-weight: 700; font-size: 13px; }}
                .mono {{ font-family: monospace; color: #94a3b8; font-size: 12px; word-break: break-all; background: #090d16; padding: 10px; border-radius: 6px; margin-top: 12px; }}
            </style>
        </head>
        <body>
            <div class="card">
                <span class="badge">✓ CRYPTOGRAPHIC TOKEN VERIFIED ({action})</span>
                <h2 style="margin: 16px 0 8px;">Ticket {ticket.ticket_id} → {ticket.state.value}</h2>
                <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
                    Recipient: <strong>{ticket.payload.customer_name}</strong> ({ticket.payload.customer_email})<br/>
                    Subject: {ticket.payload.subject}
                </p>
                <div class="mono">
                    Audit Hash: {ticket.dispatched_email.cryptographic_audit_hash if ticket.dispatched_email else 'N/A'}
                </div>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)

    return JSONResponse(
        content={
            "status": "success",
            "action_executed": action,
            "ticket": ticket.model_dump(mode="json"),
        }
    )


@router.post("/action")
async def execute_magic_link_post(
    token: str = Query(..., description="Signed HMAC-SHA256 JWT action token"),
) -> Dict[str, Any]:
    """POST variant for executing the cryptographic magic-link token directly from the Mission Control UI."""
    try:
        ticket, action = await hitl_engine.execute_magic_link_token(token)
        return {
            "status": "success",
            "action_executed": action,
            "ticket": ticket.model_dump(mode="json"),
        }
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid cryptographic token: {exc}") from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/threshold")
async def update_confidence_threshold(req: ThresholdUpdateRequest) -> Dict[str, Any]:
    """Updates the HITL mandatory human review confidence threshold and re-evaluates all tickets."""
    tickets = hitl_engine.update_confidence_threshold(req.confidence_threshold)
    return {
        "confidence_threshold": hitl_engine.confidence_threshold,
        "tickets": [t.model_dump(mode="json") for t in tickets],
    }


@router.post("/demo", response_model=List[TicketRecord])
async def run_ticket_demo_scenario(
    scenario: Literal[
        "duplicate_billing",
        "high_value_escalation",
        "enterprise_saml_500",
        "academic_retroactive_refund",
        "all",
    ] = Query(default="all", description="Preset scenario key or 'all' to run the full showcase"),
) -> List[TicketRecord]:
    """Triggers one or all demo support tickets for instant live video demonstration."""
    results: List[TicketRecord] = []
    if scenario == "all":
        for key in [
            "duplicate_billing",
            "high_value_escalation",
            "enterprise_saml_500",
            "academic_retroactive_refund",
        ]:
            record = await hitl_engine.ingest_and_process_ticket(DEMO_TICKET_SCENARIOS[key])
            results.append(record)
    else:
        payload = DEMO_TICKET_SCENARIOS.get(scenario)
        if not payload:
            raise HTTPException(status_code=400, detail=f"Unknown scenario '{scenario}'")
        record = await hitl_engine.ingest_and_process_ticket(payload)
        results.append(record)
    return results


@router.get("/{ticket_id}", response_model=TicketRecord)
async def get_ticket(ticket_id: str) -> TicketRecord:
    ticket = hitl_engine.tickets.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found")
    return ticket


@router.post("/{ticket_id}/review", response_model=TicketRecord)
async def review_ticket_inline(
    ticket_id: str, review: TicketReviewRequest
) -> TicketRecord:
    """
    Inline HITL Operator review endpoint (`POST /api/tickets/{id}/review`).
    Supports approving (with optional inline draft edits), rejecting, or escalating a ticket.
    """
    try:
        return await hitl_engine.review_ticket(
            ticket_id=ticket_id,
            review=review,
            approval_method="DASHBOARD_INLINE",
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
