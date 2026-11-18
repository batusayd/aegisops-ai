import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketConnectionManager:
    """Manages active WebSocket clients for live Mission Control UI telemetry and state updates."""

    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        logger.info("WebSocket client connected. Total active: %d", len(self.active_connections))

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        logger.info("WebSocket client disconnected. Total active: %d", len(self.active_connections))

    async def broadcast_event(self, event_type: str, data: Any) -> None:
        """Broadcasts a typed JSON event to all connected Mission Control clients."""
        if not self.active_connections:
            return

        payload = json.dumps(
            {
                "event": event_type,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "data": data,
            },
            default=str,
        )

        stale_connections: List[WebSocket] = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                stale_connections.append(connection)

        if stale_connections:
            async with self._lock:
                for stale in stale_connections:
                    if stale in self.active_connections:
                        self.active_connections.remove(stale)


ws_manager = WebSocketConnectionManager()
