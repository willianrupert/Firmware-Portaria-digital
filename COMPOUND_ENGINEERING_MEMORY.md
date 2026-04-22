# Engineering Memory: RLight Portaria V7 - The Web Evolution

**Project:** RLight Portaria Digital
**Platform:** Orange Pi Zero 3 (Host) + ESP32-S3 (IO Hub)
**Connectivity:** Native USB CDC + WebSocket Bridge

---

## 1. Hardware & Firmware Foundations (Legacy)

### The "13-Pin" USB Integration
We utilize the internal 13-pin expansion header of the Orange Pi Zero 3 to connect the ESP32-S3 directly via Native USB CDC, saving external ports for the camera.

### Octal PSRAM Conflict (WROOM-2 N8R8)
The module uses an Octal bus that interferes with **GPIO 33-37**. We remapped all sensors to safe pins (**1, 2, 15, 16, 38-42**) and stabilized the flash timing with `board_build.arduino.memory_type = qio_opi`.

---

## 2. Architecture Shift: Pygame to Web SPA (v7)

### Rationale
Previously, the system used Pygame for the UI, which imposed high CPU overhead and was difficult to style. In v7, we migrated to a **Modern Web SPA** (Single Page Application) for better aesthetics and performance.

### Tech Stack
- **Backend:** FastAPI (Python 3.11).
- **Communication:** WebSockets (broadcast de estados em tempo real).
- **Frontend:** Vanilla JS + CSS (Glassmorphism design).
- **Runtime:** Chromium-browser (Kiosk Mode) + Matchbox Window Manager.

---

## 3. Reactive State Management

Implemented a **WebSocket Bridge** between the local Serial Bridge and the Web UI:
1.  **ESP32** sends JSON state updates via USB CDC.
2.  **SerialBridge** (Host) parses and updates the `MachineState` singleton.
3.  **FastAPI** detects the transition and broadcasts a `STATE_TRANSITION` event via WebSocket to all connected UI instances.

---

## 4. Display & Kiosk Optimization

### Vertical Portrait Layout
The display was rotated 90 degrees to operate in **Portrait Mode** (600x1024).
- **Config:** `video=HDMI-A-1:1024x600M@60,rotate=90` in `armbianEnv.txt`.
- **UI Focus:** Design centrado e verticalizado para facilitar o uso em portarias.

### Smart Power Management (DPMS)
Integrated a software-level backlight control:
- **IDLE State:** Screen turns OFF electronically via `bl_power` (sysfs).
- **AWAKE/Active:** Screen triggers ON instantly, providing zero latency for the user experience.

---

## 5. System Orchestration (Systemd)

O sistema v7 é orquestrado por dois serviços interdependentes:
1.  `rlight.service`: Gerencia o backend, Serial Bridge e WebSockets.
2.  `rlight-ui.service`: Gerencia o Xorg, Matchbox e o Chromium Kiosk.

---

## 6. Access Hardware Migration (Wiegand to I2C)

### The Shift to Matrix Keypad
O antigo leitor Wiegand exigia polling intensivo e ocupava portas lógicas nobres da placa. Migramos o controle de acesso para um **Teclado Matricial (Keypad) via I2C**, utilizando o módulo expansor **PCF8574** (Endereço `0x20`).

### Impacto e Benefícios:
- **Redução de Pinos**: Apenas os pinos I2C padrão (`SDA 21`, `SCL 38`) em uso.
- **Eficiência Computacional**: Uso do pino de interrupção (`INT`) no `GPIO 6` do ESP32 elimina o polling agressivo, reativando a rotina apenas por gatilhos de hardware (Toques Físicos).
- **Segurança**: Foi implementada na FSM (`StateMachine`) a captura em tempo real que envia um evento reativo de `KEY_PRESS` ao frontend, providenciando o desenho instantâneo de mascaramentos de senha (`*`) sem o tráfego do dado em texto pleno pelo WebSocket.

---

## 7. Status Final: RLight v7 "Glassmorphism"
- [x] Transição de hardware do controle de acesso efetuada com sucesso.
- [x] Comunicação reativa via WebSockets estabilizada.
- [x] Rotação vertical e layout premium integrados.
- [x] Gestão de energia automatizada.
- [x] Deploy automatizado via systemd.

---
*Ultima Atualização: 21 de Abril de 2026*
