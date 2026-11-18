from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.models.schemas import KBCitation
from app.services.rag_service import rag_service

router = APIRouter(prefix="/api/kb", tags=["Vector Knowledge Base & RAG (Qdrant + PyMuPDF)"])


class KBSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)
    top_k: int = Field(default=3, ge=1, le=10)


class KBIngestMarkdownRequest(BaseModel):
    filename: str = Field(..., example="custom_sla_policy.md")
    content: str = Field(..., min_length=40)


@router.post("/ingest")
async def ingest_knowledge_base(
    reseed: bool = True,
    custom_doc: Optional[KBIngestMarkdownRequest] = None,
) -> Dict[str, Any]:
    """
    Ingests or re-indexes the `seed/` Markdown/PDF files into Qdrant,
    and optionally indexes a custom Markdown policy document.
    """
    result: Dict[str, Any] = {}
    if reseed:
        result["seed_ingestion"] = rag_service.ingest_seed_directory()
    if custom_doc:
        result["custom_document"] = rag_service.ingest_custom_document(
            custom_doc.filename, custom_doc.content.encode("utf-8")
        )
    result["total_chunks_in_qdrant"] = len(rag_service.list_all_chunks())
    return result


@router.post("/upload")
async def upload_knowledge_base_file(
    file: UploadFile = File(...),
) -> Dict[str, Any]:
    """
    Ingests an uploaded `.pdf` (parsed via PyMuPDF `fitz`) or `.md`/`.txt` document into Qdrant.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    content_bytes = await file.read()
    info = rag_service.ingest_custom_document(file.filename, content_bytes)
    return {
        "status": "indexed",
        "details": info,
        "total_chunks_in_qdrant": len(rag_service.list_all_chunks()),
    }


@router.get("/chunks")
async def list_indexed_kb_chunks() -> Dict[str, Any]:
    """Returns all indexed policy and runbook chunks currently stored in Qdrant."""
    chunks = rag_service.list_all_chunks()
    return {
        "engine": rag_service.connection_mode,
        "collection": rag_service.collection_name,
        "count": len(chunks),
        "chunks": chunks,
    }


@router.post("/search", response_model=List[KBCitation])
async def search_knowledge_base(req: KBSearchRequest) -> List[KBCitation]:
    """Performs a live vector similarity search against Qdrant and returns cited snippets."""
    return rag_service.retrieve_relevant_chunks(req.query, top_k=req.top_k)
