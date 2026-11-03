import json
import logging
from typing import Dict, List, Set, Any
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class EmergencyConnectionManager:
    """
    Manages live WebSocket connections, case-specific room channels,
    role-based broadcasts, and delivery logging.
    """

    def __init__(self):
        # All active client connections: client_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # Client metadata: client_id -> {"role": role, "user_id": user_id, "cases": set()}
        self.client_meta: Dict[str, Dict[str, Any]] = {}
        # Case subscriptions: case_id -> Set[client_id]
        self.case_subscribers: Dict[str, Set[str]] = {}
        # Dispatcher connections: Set[client_id]
        self.dispatchers: Set[str] = set()
        # Responder connections: responder_id -> Set[client_id]
        self.responders: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, client_id: str, role: str = "citizen", user_id: str = ""):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.client_meta[client_id] = {
            "role": role,
            "user_id": user_id or client_id,
            "cases": set()
        }

        if role in ["admin", "dispatcher"]:
            self.dispatchers.add(client_id)
        elif role in ["worker", "responder"]:
            if user_id not in self.responders:
                self.responders[user_id] = set()
            self.responders[user_id].add(client_id)

        logger.info(f"WebSocket client connected: {client_id} (Role: {role})")
        
        # Send initial confirmation handshake
        await self.send_personal_message({
            "type": "connection.established",
            "client_id": client_id,
            "status": "connected",
            "message": "SAHAYA AI Emergency Real-Time Transport Active"
        }, client_id)

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            meta = self.client_meta.get(client_id, {})
            role = meta.get("role", "")
            user_id = meta.get("user_id", "")

            if client_id in self.dispatchers:
                self.dispatchers.remove(client_id)
            if user_id in self.responders and client_id in self.responders[user_id]:
                self.responders[user_id].remove(client_id)

            # Unsubscribe from cases
            for case_id in meta.get("cases", set()):
                if case_id in self.case_subscribers:
                    self.case_subscribers[case_id].discard(client_id)

            del self.active_connections[client_id]
            if client_id in self.client_meta:
                del self.client_meta[client_id]

            logger.info(f"WebSocket client disconnected: {client_id}")

    def subscribe_case(self, client_id: str, case_id: str):
        if case_id not in self.case_subscribers:
            self.case_subscribers[case_id] = set()
        self.case_subscribers[case_id].add(client_id)
        if client_id in self.client_meta:
            self.client_meta[client_id]["cases"].add(case_id)

    async def send_personal_message(self, message: Dict[str, Any], client_id: str):
        websocket = self.active_connections.get(client_id)
        if websocket:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Failed to send personal message to {client_id}: {e}")

    async def broadcast_to_case(self, case_id: str, event_type: str, payload: Dict[str, Any]):
        """
        Sends event to all authorized subscribers of this specific case,
        plus all active dispatchers.
        """
        message = {
            "type": event_type,
            "case_id": case_id,
            "payload": payload
        }
        text = json.dumps(message)

        # 1. Send to subscribers of this case
        subscribers = set(self.case_subscribers.get(case_id, set()))
        # 2. Also send to all dispatchers
        subscribers.update(self.dispatchers)

        for client_id in subscribers:
            ws = self.active_connections.get(client_id)
            if ws:
                try:
                    await ws.send_text(text)
                except Exception as e:
                    logger.warning(f"Error broadcasting to {client_id}: {e}")

    async def notify_responder(self, responder_id: str, event_type: str, payload: Dict[str, Any]):
        """Direct notification to a specific assigned responder's active devices."""
        client_ids = self.responders.get(responder_id, set())
        message = {
            "type": event_type,
            "payload": payload
        }
        text = json.dumps(message)
        for cid in client_ids:
            ws = self.active_connections.get(cid)
            if ws:
                try:
                    await ws.send_text(text)
                except Exception as e:
                    logger.warning(f"Error notifying responder {responder_id}: {e}")

    async def broadcast_to_dispatchers(self, event_type: str, payload: Dict[str, Any]):
        """Broadcasts operational queue events to all dispatchers."""
        message = {
            "type": event_type,
            "payload": payload
        }
        text = json.dumps(message)
        for cid in list(self.dispatchers):
            ws = self.active_connections.get(cid)
            if ws:
                try:
                    await ws.send_text(text)
                except Exception as e:
                    logger.warning(f"Error sending to dispatcher {cid}: {e}")


ws_manager = EmergencyConnectionManager()

