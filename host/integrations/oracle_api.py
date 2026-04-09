import requests
import threading
import time
from core.config import config

class OracleRESTClient:
    """Integração final em background (Offline-First) com Retentativas Infinitas Limpas."""
    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {config.ORACLE_BEARER}"
        }

    def push_receipt_async(self, jwt_token: str, photo_bytes: bytes):
        """Envia para API num loop resiliente de backoff evitando perdas por falta de internet."""
        def worker():
            attempt = 1
            while True:
                try:
                    files = {'image': ('evidence.jpg', photo_bytes, 'image/jpeg')}
                    data = {'delivery_token': jwt_token, 'timestamp': 'auto'}
                    
                    print(f"[Oracle Cloud] Tentativa {attempt} subindo comprovante criptografado...")
                    response = requests.post(
                        config.ORACLE_API_URL, 
                        headers=self.headers,
                        data=data,
                        files=files,
                        timeout=10 # Falha crua de connect não trava o Worker muito tempo
                    )
                    
                    if response.status_code in [200, 201]:
                        print("[Oracle Cloud] Upload efetuado com SUCESSO!")
                        break # Break loop! Postado ok.
                    else:
                        print(f"[Oracle Cloud] Status Inesperado: {response.status_code}")
                except Exception as e:
                    print(f"[Oracle Cloud] Offline ou Falha (Esperando {attempt*5}s...): {e}")
                
                # Back-off para a próxima tentativa online (se sem internet) sem ferrar a CPU
                # Exato pra funcionar perfeitamente quando cabos são consertados.
                time.sleep(min(60, attempt * 5)) 
                attempt += 1

        # Lança num thread desprendido que gasta ~0% cpu e aguarda socket na paz
        t = threading.Thread(target=worker, daemon=True)
        t.start()

oracle_api = OracleRESTClient()
