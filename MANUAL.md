# Manual de Engenharia e Montagem Física - RLight v7 (Padrão Industrial)

Este é o documento normativo de engenharia para a montagem e instalação do **RLight Portaria Autônoma v7**. Ele detalha os diagramas de fiação, lista de materiais, chicotes de rede e esquemas de proteção elétrica em nível profissional.

> [!WARNING]
> **Alterações Críticas (Maio/2026):** 
> 1. O protocolo **Wiegand foi totalmente descontinuado**. O acesso via teclado foi unificado através de um **Teclado Matricial I2C (PCF8574)**.
> 2. Pinos GPIO 33 ao 37 são **PROIBIDOS** no módulo ESP32-S3 WROOM-2 N8R8 (conflito fatal com a Octal PSRAM). Os botões foram remapeados para os pinos seguros 4, 5 e 7.

---

## 1. Bill of Materials (Lista de Materiais - BoM)

Abaixo estão os componentes técnicos exatos para a construção da portaria:

### Processamento e Lógica
*   **1x Single Board Computer:** Orange Pi Zero 3 (Allwinner H618, 1.5GHz, 2GB LPDDR4).
*   **1x Microcontrolador IO:** Módulo ESP32-S3 WROOM-2 N8R8 (8MB PSRAM Octal, 8MB Flash).
*   **1x Placa de Expansão (Breakout Board):** Placa Base para ESP32 de 38 Pinos (Facilita fiação por bornes a parafuso).
*   **1x Cartão de Memória:** MicroSD 32GB Classe 10 A1 (Industrial preferencialmente, ex: SanDisk High Endurance).

### Sensores e Módulos de Comunicação
*   **1x Leitor de Código de Barras/QR:** Módulo Scanner Hangzhou Grow Technology **GM861S** (UART TTL/USB).
*   **1x Radar de Onda Milimétrica (mmWave):** Hi-Link **LD2410B** 24GHz.
*   **1x Teclado Matricial:** Teclado de Membrana ou Plástico ABS 4x3 (12 Teclas).
*   **1x Expansor de I/O I2C:** Módulo **PCF8574** (Para o teclado matricial).
*   **1x Balança de Carga:** Módulo Amplificador A/D de 24 bits **HX711**.
*   **4x Células de Carga:** Strain Gauges de 50kg cada (Formando uma ponte de Wheatstone para 200kg totais).
*   **2x Sensores de Tensão/Corrente I2C:** Texas Instruments **INA219** (Monitoramento anti-sabotagem das travas).
*   **2x Sensores Magnéticos:** Reed Switch NA (Normalmente Aberto) com imã (Sensores de porta P1 e P2).

### Atuadores e Interface
*   **1x Display:** Tela LCD TFT 7" polegadas (1024x600) com interface micro-HDMI.
*   **1x Módulo Relé/MOSFET:** Módulo de Relé Óptico de 4 Canais (Isolamento Galvânico de 12V).
*   **2x Travas Eletromagnéticas:** Fechadura "Strike" Fail-Secure 12V (Abre apenas com pulso elétrico).
*   **1x Botão Push-Button Metálico:** 16mm/19mm NA com LED Halo iluminado (5V/12V).
*   **1x Buzzer Ativo:** 5V para alertas sonoros.
*   **1x Cooler com Filtro:** Micro-ventilador DC 12V 40x40x10mm com tela filtro de poeira (Para refrigeração do quadro).
*   **2x Diodos Retificadores:** 1N4007 (Para Diodo Flyback das fechaduras magnéticas).

### Infraestrutura e Energia
*   **1x Fonte de Lógica:** Fonte Chaveada Mean Well RS-25-5 (5V / 5A) - Estabilidade absoluta.
*   **1x Fonte de Potência:** Fonte Chaveada Mean Well RS-50-12 (12V / 4.2A).
*   **1x Conector Multivias:** Conector Circular Aviação GX16 de 16 Pinos (Macho e Fêmea).
*   **Vários:** Conectores RJ45 (Keystones fêmea e Plugs Macho RJ45), Cabos de Rede Cat5e FTP, Fios cabinho AWG 22 (para jumper).

---

## 2. Topologia de Ambientes

*   **Ambiente A (Fachada Externa):** Painel da rua (Tela 7", GM861S, Teclado+PCF8574, Botão Metálico, Buzzer).
*   **Ambiente B (Porta/Grade):** Travas (Strikes) e os sensores magnéticos (Reed Switches).
*   **Ambiente C (Central Interna):** Quadro de comando hermético contendo Orange Pi, Breakout Board ESP32-S3, Fontes, Relés, INA219 e o Cooler de 40mm.

---

## 3. Ambiente C: O Núcleo do Sistema (Painel Interno)

Alojado em um quadro hermético na área interna da casa.

### 3.1. Arquitetura de Energia e Refrigeração
*   **Fonte 1 Lógica (5V):** Alimenta Orange Pi, Breakout do ESP32-S3 e periféricos do Ambiente A.
*   **Fonte 2 Potência (12V):** Alimenta as Travas e o **Cooler 12V 40mm**.
*   **Aterramento:** Conecte o cabo GND da Fonte 5V com o GND da Fonte 12V (Terra Comum da Breakout Board).
*   **Cooler de 40mm (Filtro de Poeira):** 
    *   Posicionado na lateral inferior do quadro "jogando ar frio para dentro".
    *   **Pino VCC (12V):** Ligado à saída NA (Normalmente Aberto) do Módulo Relé/MOSFET.
    *   **Controle (Relé):** Acionado pelo ESP32-S3 via **`GPIO 47`**.

### 3.2. Cérebro: Orange Pi e ESP32-S3 (Breakout Board)
A Breakout Board resolve problemas de soldagem, oferecendo bornes de parafuso. Use os GNDs da Breakout para aterrar todos os shields I2C.
*   **Comunicação (Native USB CDC):** Use um cabo USB com os condutores de dados descascados ligados à Breakout.
    *   Orange Pi porta USB -> ESP32-S3 `GPIO 19` (D-) e `GPIO 20` (D+).
*   **Conectividade Externa:** Cabo de rede rígido ligado ao RJ45 da Orange Pi. (Wi-Fi proibido).

---

## 4. O Umbilical da Fachada: Conector Aviação de 16 Pinos

Todo o sinal do **Ambiente A** para o **Ambiente C** passa pelo Conector GX16 (16 pinos). 
*(Nota: O cabo de vídeo micro-HDMI da tela LCD deve ser passado separadamente na tubulação, possuindo blindagem própria).*

**Mapeamento Absoluto (GX16):**
1.  **Livre / Reserva** (Antigo USB D+)
2.  **Livre / Reserva** (Antigo USB D-)
3.  **UART0 RX** -> ESP32 `GPIO 44` (Conecta ao TX do GM861S)
4.  **UART0 TX** -> ESP32 `GPIO 43` (Conecta ao RX do GM861S)
5.  **I2C SDA** -> ESP32 `GPIO 21` (Conecta ao SDA do PCF8574)
6.  **I2C SCL** -> ESP32 `GPIO 38` (Conecta ao SCL do PCF8574)
7.  **KEYPAD INT** -> ESP32 `GPIO 6` (Conecta ao pino INT do PCF8574)
8.  **LED BTN** -> ESP32 `GPIO 39` (Liga o Halo Ring do Botão Metálico via Resistor 220Ω)
9.  **LED QR** -> ESP32 `GPIO 40` (Iluminação extra do leitor, se usado pin auxiliar)
10. **BUZZER** -> ESP32 `GPIO 48` (Conecta ao I/O ou positivo do Buzzer Ativo 5V)
11. **BUTTON** -> ESP32 `GPIO 7` (Sinal do contato NA do Botão Metálico. Puxado pra GND quando apertado).
12. **GND Lógica (Terra)**
13. **GND Lógica (Reforço/Malha)**
14. **VCC 5V Lógica** (Alimentação do GM861S, PCF8574 e Tela de 7" caso alimentada via cabo DC).
15. **VCC 5V Lógica (Reforço)**
16. **Livre / Reserva**

---

## 5. Especificação dos Chicotes RJ45 (Periféricos Isolados)

Conectores Keystones RJ45 blindados instalados no Painel C fornecem tomadas para cada periférico da portaria. Utiliza-se a pinagem padrão T568B:

### 5.1. Chicote 1: Radar mmWave (Hi-Link LD2410B)
O módulo LD2410B possui 5 pinos: `VCC`, `GND`, `TX`, `RX`, `OUT`. O `OUT` pode ser ignorado pois usamos o protocolo UART serial complexo (Distâncias e alvos dinâmicos).
*   **Branco/Laranja:** LD2410B `VCC` (Alimentado pela Fonte 5V Lógica)
*   **Laranja:** LD2410B `GND`
*   **Branco/Verde:** LD2410B `RX` -> ESP32 `GPIO 17` (UART1 TX)
*   **Azul:** LD2410B `TX` -> ESP32 `GPIO 18` (UART1 RX)

### 5.2. Chicote 2: Balança (Módulo HX711)
A balança requer ausência de ruídos na ponte de Wheatstone analógica. Portanto, o amplificador HX711 **deve ficar junto das células de carga**, e do HX711 envia-se o sinal digital via RJ45 até o painel central.
*   **Células -> HX711 (Fiação na base da balança):**
    *   HX711 `E+` -> Fio Vermelho (Excitation +)
    *   HX711 `E-` -> Fio Preto (Excitation -)
    *   HX711 `A-` -> Fio Branco (Signal -)
    *   HX711 `A+` -> Fio Verde (Signal +)
*   **Chicote RJ45 (HX711 -> Painel C):**
    *   **Branco/Laranja:** HX711 `VCC` (5V Lógica)
    *   **Laranja:** HX711 `GND`
    *   **Branco/Verde:** HX711 `SCK` (Clock) -> ESP32 `GPIO 41`
    *   **Azul:** HX711 `DT` (Data) -> ESP32 `GPIO 42`

### 5.3. Chicotes 3 e 4: Fechaduras (Strikes P1 e P2) + Reed Switches
*   **Branco/Laranja:** Strike 12V VCC (Ligado direto na Fonte 12V Positivo)
*   **Laranja:** Strike 12V GND (Ligado na saída do Relé, fechando circuito para a Fonte 12V)
*   **Azul:** Reed Switch GND -> Terra da Fonte Lógica 5V.
*   **Branco/Azul:** Reed Switch Sinal -> ESP32 `GPIO 4` (P1) ou `GPIO 5` (P2)

> [!CAUTION]
> **Diodo Flyback Obrigatório:**
> É mandatório soldar o Diodo `1N4007` **junto à fechadura (na porta)**, em paralelo com a bobina, inversamente polarizado: Catodo (faixa prata) no fio de 12V, e Anodo no fio de GND. Isso absolve a descarga indutiva da bobina. Sem ele, a vida útil do Relé despenca e a Fonte 12V joga ruído elétrico na Breakout Board.

---

## 6. Pinagem Interna Detalhada dos Módulos

### 6.1. Leitor QR Code (GM861S)
*   `VCC` -> +5V (Pino 14/15 da Aviação)
*   `GND` -> Terra (Pino 12/13 da Aviação)
*   `RXD` -> Fio UART0 TX (Pino 4 da Aviação)
*   `TXD` -> Fio UART0 RX (Pino 3 da Aviação)

### 6.2. Teclado Matricial e PCF8574
O PCF8574 converte os 7 fios da membrana 4x3 em um barramento I2C inteligente.
*   **Fiação Teclado -> PCF8574:**
    *   `Linha 1 a 4` -> PCF8574 `P0`, `P1`, `P2`, `P3`
    *   `Coluna 1 a 3` -> PCF8574 `P4`, `P5`, `P6`
*   **Fiação PCF8574 -> Aviação:**
    *   `VCC` -> +5V Lógica
    *   `GND` -> Terra
    *   `SDA` -> Pino 5 Aviação (Para GPIO 21)
    *   `SCL` -> Pino 6 Aviação (Para GPIO 38)
    *   `INT` -> Pino 7 Aviação (Para GPIO 6) - **Sinal de Active LOW quando a tecla for pressionada**.

### 6.3. Monitores de Corrente da Fechadura (INA219 x 2)
Ficam localizados no Painel C. Usados para confirmar via sensor de Hall/Shunt que a energia fluiu de fato para a trava, impedindo sabotagem por relé preso.
*   **Alimentação Lógica (Ambos):** `VCC` a 3.3V (do breakout do ESP32) e `GND` ao Terra.
*   **I2C (Ambos):** `SDA` e `SCL` vão em paralelo para o `GPIO 21` e `GPIO 38`.
*   **Circuito de Potência P1 (Endereço 0x40):** O fio positivo 12V da Fonte entra em `Vin+` e sai pelo `Vin-` rumo ao Strike P1.
*   **Circuito de Potência P2 (Endereço 0x41):** É **OBRIGATÓRIO** soldar a ponte no pad `A0` na placa do módulo para que o barramento assuma endereço alternativo. O fio positivo 12V entra em `Vin+` e sai pelo `Vin-` rumo ao Strike P2.

> [!CAUTION]
> **Integridade de Barramento (Bypass e Pull-ups):**
> Adicione **resistores pull-up de 4.7kΩ** nos terminais `SDA` e `SCL` puxando para `3.3V` nos bornes da placa Breakout Board do ESP32. Além disso, solde pequenos capacitores de bypass cerâmicos (`100nF`) perto dos pinos VCC e GND dos chips PCF8574 e INA219. Essas práticas suprimem EMI em chicotes longos e mantêm o I2C com 100% de confiabilidade.
