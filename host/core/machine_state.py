import threading

class MachineState:
    """
    Observer pattern para espelhar a FSM robusta do ESP32 dentro do Python.
    Permite que múltiplas frentes (UI, Home Assistant) assinem e reajam à mudanças de estado.
    """
    def __init__(self):
        self._state = "IDLE"
        self._last_state = None
        self._weight_realtime = 0.0
        self._jwt_token = None
        
        self._lock = threading.Lock()
        self._listeners = []
        self._event_listeners = []

    def subscribe(self, callback):
        """Registra callback que será chamado em variações de estado."""
        with self._lock:
            self._listeners.append(callback)

    def subscribe_event(self, callback):
        """Registra callback para eventos genéricos (ex: KEY_PRESS)."""
        with self._lock:
            self._event_listeners.append(callback)

    def update_from_payload(self, payload: dict):
        """Atualiza a FSM interna baseada em dados USB e notifica listeners se houve alteração no state principal."""
        changed = False
        with self._lock:
            if "state" in payload:
                new_state = payload["state"]
                if new_state != self._state:
                    self._last_state = self._state
                    self._state = new_state
                    changed = True
            
            if "weight" in payload:
                self._weight_realtime = float(payload["weight"])
                
            if "jwt" in payload:
                self._jwt_token = payload["jwt"]

            if "event" in payload:
                # Trata eventos instantâneos (não persistentes)
                self._notify_event(payload["event"])

        if changed:
            self._notify_listeners()

    def _notify_event(self, event_name):
        for cb in self._event_listeners:
            try:
                cb(event_name)
            except Exception as e:
                print(f"[FSM Error] Event Listener exception: {e}")

    def _notify_listeners(self):
        # Dispara fora do lock principal para não prender a thread Serial
        state = self.get_state()
        last = self.get_last_state()
        for cb in self._listeners:
            try:
                cb(state, last)
            except Exception as e:
                print(f"[FSM Error] Listener exception: {e}")

    def get_state(self):
        with self._lock:
            return self._state

    def get_last_state(self):
        with self._lock:
            return self._last_state

    def get_weight(self):
        with self._lock:
            return self._weight_realtime
            
    def get_jwt(self):
        with self._lock:
            return self._jwt_token

# Instância Singleton global para o host
host_fsm = MachineState()
