import cv2
import threading
from core.config import config
import pygame

class WebCamCapture:
    """Acesso direto à WebCam Headless para garantir registro confiável na Base."""
    
    def __init__(self):
        self.lock = threading.Lock()
        self.last_frame = None
        self.last_surface = None

    def capture_snapshot(self) -> bytes:
        """Abre a câmera em 1080p (se suportado), bate a foto e devolve o JPG e a Pygame Surface em cache."""
        with self.lock:
            # Reabre a cada captura para não prender a interface USB
            cap = cv2.VideoCapture(config.WEBCAM_ID)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
            
            # Descarta primeiros frames escuros da calibração auto-brightness do sensor
            for _ in range(5):
                cap.read()
                
            ret, frame = cap.read()
            cap.release()

            if ret:
                # 1. Enviar para JPG para o Oracle Cloud
                success, encoded_image = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                if success:
                    self.last_frame = encoded_image.tobytes()
                    
                # 2. Enviar para RGB Color pra o Pygame (TELA RECEIPT)
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                # Converter para Surface
                self.last_surface = pygame.image.frombuffer(
                    frame_rgb.tobytes(), frame_rgb.shape[1::-1], "RGB"
                )
                
                return self.last_frame
            return None

    def get_last_surface(self):
        return self.last_surface

webcam = WebCamCapture()
