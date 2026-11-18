import asyncio
import hashlib
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Literal, Optional, Tuple

import jwt

from app.config import get_settings
from app.models.schemas import (
    DispatchedEmailRecord,
    StateTransitionLog,
    TicketRecord,
    TicketReviewRequest,
    TicketState,
    TicketWebhookPayload,
    UrgencyLevel,
)
from app.services.ai_router import ai_router
from app.services.rag_service import rag_service
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)


class HITLApprovalEngine:
    """
    Smart Human-in-the-Loop (HITL) State Machine & Cryptographic Magic-Link Signer:
    - Transitions tickets through INGESTED -> CLASSIFIED -> DRAFTED -> PENDING_APPROVAL -> APPROVED_AND_SENT / REJECTED / ESCALATED
    - Evaluates dynamic confidence thresholds & policy escalation rules
    - Signs & verifies HMAC-SHA256 JWT tokens for one-click operator magic links (/api/tickets/action?token=...)
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.confidence_threshold: float = self.settings.HITL_CONFIDENCE_THRESHOLD
        self.tickets: Dict[str, TicketRecord] = {}
        self.dispatched_emails: List[DispatchedEmailRecord] = []

    # ------------------------------------------------------------------
    # Cryptographic Signed Action Tokens (JWT HMAC-SHA256)
    # ------------------------------------------------------------------
    def generate_action_token(
        self,
        ticket_id: str,
        action: Literal["APPROVE", "REJECT"],
        draft_text: str,
    ) -> str:
        draft_hash = hashlib.sha256(draft_text.encode("utf-8")).hexdigest()[:16]
        now = datetime.now(timezone.utc)
        exp = now + timedelta(minutes=self.settings.HITL_TOKEN_EXPIRY_MINUTES)
        payload = {
            "sub": ticket_id,
            "action": action,
            "draft_hash": draft_hash,
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
            "iss": "omnichannel-hitl-engine",
        }
        return jwt.encode(
            payload,
            self.settings.HITL_ACTION_TOKEN_SECRET,
            algorithm="HS256",
        )

    def verify_action_token(self, token: str) -> Dict[str, str]:
        decoded = jwt.decode(
            token,
            self.settings.HITL_ACTION_TOKEN_SECRET,
            algorithms=["HS256"],
            options={"require": ["sub", "action", "exp"]},
        )
        return {
            "ticket_id": str(decoded["sub"]),
            "action": str(decoded["action"]),
            "draft_hash": str(decoded.get("draft_hash", "")),
        }

    # ------------------------------------------------------------------
    # State Transition Helper
    # ------------------------------------------------------------------
    async def _transition(
        self,
        ticket: TicketRecord,
        new_state: TicketState,
        actor: str,
        note: str,
    ) -> None:
        prev_state = ticket.state
        ticket.state = new_state
        ticket.updated_at = datetime.utcnow()
        ticket.state_history.append(
            StateTransitionLog(
                from_state=prev_state,
                to_state=new_state,
                actor=actor,
                note=note,
            )
        )
        await ws_manager.broadcast_event(
            "TICKET_UPDATED", ticket.model_dump(mode="json")
        )

    # ------------------------------------------------------------------
    # End-to-End Ticket Triage, RAG Retrieval & HITL Queueing Pipeline
    # ------------------------------------------------------------------
    async def ingest_and_process_ticket(
        self, payload: TicketWebhookPayload
    ) -> TicketRecord:
        ticket_id = f"TKT-{uuid.uuid4().hex[:6].upper()}"
        ticket = TicketRecord(
            ticket_id=ticket_id,
            state=TicketState.INGESTED,
            payload=payload,
            confidence_threshold_applied=self.confidence_threshold,
            state_history=[
                StateTransitionLog(
                    from_state=None,
                    to_state=TicketState.INGESTED,
                    actor="WEBHOOK_INGESTOR",
                    note=f"Ticket ingested via {payload.channel} from {payload.customer_email}",
                )
            ],
        )
        self.tickets[ticket_id] = ticket
        await ws_manager.broadcast_event(
            "TICKET_UPDATED", ticket.model_dump(mode="json")
        )

        # Stage 1: Fast Router Intent & Urgency Classification
        classification, cls_metric = await ai_router.classify_ticket_intent(payload)
        ticket.classification = classification
        ticket.llm_metrics.append(cls_metric)
        await self._transition(
            ticket,
            TicketState.CLASSIFIED,
            actor=f"FAST_ROUTER ({cls_metric.model_used})",
            note=f"Classified as {classification.category.value} | Urgency={classification.urgency.value} | Sentiment={classification.sentiment.value} ({cls_metric.latency_ms}ms)",
        )

        # Stage 2: Qdrant Vector DB Semantic Policy Retrieval
        search_query = f"{payload.subject}\n{payload.body}\n{' '.join(classification.key_entities)}"
        retrieved_chunks = rag_service.retrieve_relevant_chunks(search_query, top_k=3)
        ticket.retrieved_chunks = retrieved_chunks
        await ws_manager.broadcast_event(
            "TICKET_UPDATED", ticket.model_dump(mode="json")
        )

        # Stage 3: Reasoning LLM Cited RAG Response Draft
        rag_draft, draft_metric = await ai_router.generate_rag_draft(
            payload, classification, retrieved_chunks
        )
        ticket.rag_draft = rag_draft
        ticket.llm_metrics.append(draft_metric)
        await self._transition(
            ticket,
            TicketState.DRAFTED,
            actor=f"REASONING_AGENT ({draft_metric.model_used})",
            note=f"Drafted response citing {', '.join(rag_draft.citations)} | Confidence={rag_draft.confidence_score:.2f} ({draft_metric.latency_ms}ms)",
        )

        # Stage 4: Evaluate HITL Mandatory Review Rules & Generate Cryptographic Magic Links
        reasons: List[str] = []
        if rag_draft.confidence_score < self.confidence_threshold:
            reasons.append(
                f"Low Draft Confidence ({rag_draft.confidence_score:.2f} < {self.confidence_threshold:.2f} threshold)"
            )
        if classification.urgency in (UrgencyLevel.HIGH, UrgencyLevel.CRITICAL):
            reasons.append(f"High Urgency Ticket ({classification.urgency.value})")
        if classification.requires_human_escalation:
            reasons.append(
                "Policy Escalation Triggered (POL-REF-2026#SEC-4.2: >$500 / Dispute / Production Impact)"
            )

        ticket.mandatory_human_review = len(reasons) > 0
        ticket.mandatory_review_reasons = reasons
        ticket.confidence_threshold_applied = self.confidence_threshold

        # Generate Signed Action Magic Links
        approve_token = self.generate_action_token(
            ticket_id, "APPROVE", rag_draft.draft_reply
        )
        reject_token = self.generate_action_token(
            ticket_id, "REJECT", rag_draft.draft_reply
        )
        ticket.action_token_approve = approve_token
        ticket.action_token_reject = reject_token
        base_url = self.settings.PUBLIC_BASE_URL.rstrip("/")
        ticket.approve_magic_link = f"{base_url}/api/tickets/action?token={approve_token}"
        ticket.reject_magic_link = f"{base_url}/api/tickets/action?token={reject_token}"

        await self._transition(
            ticket,
            TicketState.PENDING_APPROVAL,
            actor="HITL_APPROVAL_ENGINE",
            note=(
                f"⚠️ Routed to HITL Queue [Mandatory Review: {'; '.join(reasons)}]"
                if ticket.mandatory_human_review
                else f"Routed to HITL Queue [Standard Review — Confidence {rag_draft.confidence_score:.2f} >= {self.confidence_threshold:.2f}]"
            ),
        )
        return ticket

    # ------------------------------------------------------------------
    # Inline Operator Review OR One-Click Magic-Link Action Execution
    # ------------------------------------------------------------------
    async def review_ticket(
        self,
        ticket_id: str,
        review: TicketReviewRequest,
        approval_method: Literal[
            "DASHBOARD_INLINE", "MAGIC_LINK_TOKEN", "AUTO_APPROVED"
        ] = "DASHBOARD_INLINE",
    ) -> TicketRecord:
        ticket = self.tickets.get(ticket_id)
        if not ticket:
            raise KeyError(f"Ticket '{ticket_id}' not found")

        ticket.reviewed_by = review.operator_name
        ticket.operator_notes = review.operator_notes

        if review.action == "APPROVE":
            original_draft = (
                ticket.rag_draft.draft_reply if ticket.rag_draft else ""
            )
            final_body = (
                review.edited_reply.strip()
                if review.edited_reply and review.edited_reply.strip()
                else original_draft
            )
            edited_flag = bool(
                review.edited_reply
                and review.edited_reply.strip() != original_draft.strip()
            )
            if ticket.rag_draft and edited_flag:
                ticket.rag_draft.draft_reply = final_body

            final_subject = (
                review.edited_subject
                or (
                    ticket.rag_draft.suggested_subject
                    if ticket.rag_draft
                    else f"Re: {ticket.payload.subject}"
                )
            )
            citations = (
                ticket.rag_draft.citations if ticket.rag_draft else []
            )

            audit_input = f"{ticket_id}:{ticket.payload.customer_email}:{final_body}:{review.operator_name}:{approval_method}"
            audit_hash = hashlib.sha256(audit_input.encode("utf-8")).hexdigest()

            dispatch_record = DispatchedEmailRecord(
                dispatch_id=f"MSG-{uuid.uuid4().hex[:8].upper()}",
                ticket_id=ticket_id,
                to_name=ticket.payload.customer_name,
                to_email=ticket.payload.customer_email,
                subject=final_subject,
                final_body=final_body,
                citations_included=citations,
                approved_by=review.operator_name,
                approval_method=approval_method,
                edited_before_send=edited_flag,
                cryptographic_audit_hash=audit_hash,
            )
            ticket.dispatched_email = dispatch_record
            self.dispatched_emails.insert(0, dispatch_record)

            await self._transition(
                ticket,
                TicketState.APPROVED_AND_SENT,
                actor=f"{review.operator_name} ({approval_method})",
                note=(
                    f"Approved & dispatched outbound email {dispatch_record.dispatch_id} "
                    f"{'(with inline operator edits)' if edited_flag else '(unmodified AI draft)'}"
                ),
            )
            await ws_manager.broadcast_event(
                "EMAIL_DISPATCHED", dispatch_record.model_dump(mode="json")
            )

        elif review.action == "ESCALATE":
            await self._transition(
                ticket,
                TicketState.ESCALATED,
                actor=review.operator_name,
                note=review.operator_notes
                or "Escalated to Tier-3 Senior Engineering / Billing Specialist",
            )
        else:
            await self._transition(
                ticket,
                TicketState.REJECTED,
                actor=f"{review.operator_name} ({approval_method})",
                note=review.operator_notes or "Draft rejected by operator.",
            )

        return ticket

    async def execute_magic_link_token(self, token: str) -> Tuple[TicketRecord, str]:
        """Verifies a cryptographic HMAC action token and executes the one-click state transition."""
        verified = self.verify_action_token(token)
        ticket_id = verified["ticket_id"]
        action_str = verified["action"]
        action: Literal["APPROVE", "REJECT"] = (
            "APPROVE" if action_str == "APPROVE" else "REJECT"
        )

        review_req = TicketReviewRequest(
            action=action,
            operator_name="Cryptographic Magic-Link Operator",
            operator_notes=f"Executed via signed HMAC-SHA256 token (draft_hash={verified['draft_hash']})",
        )
        updated_ticket = await self.review_ticket(
            ticket_id=ticket_id,
            review=review_req,
            approval_method="MAGIC_LINK_TOKEN",
        )
        return updated_ticket, action

    def update_confidence_threshold(self, new_threshold: float) -> List[TicketRecord]:
        """Dynamically updates the HITL confidence threshold and re-evaluates pending tickets."""
        self.confidence_threshold = round(new_threshold, 2)
        for ticket in self.tickets.values():
            ticket.confidence_threshold_applied = self.confidence_threshold
            if ticket.rag_draft and ticket.classification:
                reasons: List[str] = []
                if ticket.rag_draft.confidence_score < self.confidence_threshold:
                    reasons.append(
                        f"Low Draft Confidence ({ticket.rag_draft.confidence_score:.2f} < {self.confidence_threshold:.2f} threshold)"
                    )
                if ticket.classification.urgency in (
                    UrgencyLevel.HIGH,
                    UrgencyLevel.CRITICAL,
                ):
                    reasons.append(
                        f"High Urgency Ticket ({ticket.classification.urgency.value})"
                    )
                if ticket.classification.requires_human_escalation:
                    reasons.append(
                        "Policy Escalation Triggered (POL-REF-2026#SEC-4.2: >$500 / Dispute)"
                    )
                ticket.mandatory_human_review = len(reasons) > 0
                ticket.mandatory_review_reasons = reasons
        return self.list_tickets()

    def list_tickets(self, state: Optional[TicketState] = None) -> List[TicketRecord]:
        items = list(self.tickets.values())
        if state:
            items = [t for t in items if t.state == state]
        return sorted(items, key=lambda x: x.created_at, reverse=True)


hitl_engine = HITLApprovalEngine()
