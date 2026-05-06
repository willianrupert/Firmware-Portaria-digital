const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  TabStopType, TabStopPosition
} = require('docx');
const fs = require('fs');

// --- Color Palette ---
const C = {
  primary:    '1A3A5C', // Deep navy
  accent:     '2E86C1', // Bright blue
  accent2:    '1ABC9C', // Teal green
  warning:    'E67E22', // Orange
  danger:     'C0392B', // Red
  success:    '27AE60', // Green
  light:      'EAF4FB', // Light blue bg
  lightWarn:  'FEF9E7', // Light yellow bg
  lightDanger:'FDEDEC', // Light red bg
  lightGreen: 'EAFAF1', // Light green bg
  gray:       'F2F3F4', // Light gray
  darkGray:   '5D6D7E', // Mid gray
  white:      'FFFFFF',
  border:     'BDC3C7',
  headerBg:   '1A3A5C',
  subheaderBg:'2E86C1',
};

// --- Helpers ---
const border = (color = C.border) => ({ style: BorderStyle.SINGLE, size: 1, color });
const allBorders = (color = C.border) => ({ top: border(color), bottom: border(color), left: border(color), right: border(color) });
const noBorder = () => ({ style: BorderStyle.NONE, size: 0, color: 'FFFFFF' });
const noAllBorders = () => ({ top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() });

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.accent, space: 4 } },
    children: [new TextRun({ text, font: 'Arial', size: 36, bold: true, color: C.primary })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, font: 'Arial', size: 28, bold: true, color: C.accent })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font: 'Arial', size: 24, bold: true, color: C.primary })]
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, font: 'Arial', size: 20, color: opts.color || '1C2833', bold: opts.bold || false, italics: opts.italic || false })]
  });
}

function mixedPara(runs, before = 80, after = 80) {
  return new Paragraph({
    spacing: { before, after },
    children: runs.map(r => new TextRun({ font: 'Arial', size: 20, color: '1C2833', ...r }))
  });
}

function bullet(text, level = 0, bold = false) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: 'Arial', size: 20, color: '1C2833', bold })]
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'numbers', level },
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, font: 'Arial', size: 20, color: '1C2833' })]
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function spacer(before = 160) {
  return new Paragraph({ spacing: { before, after: 0 }, children: [new TextRun('')] });
}

function callout(type, title, lines) {
  // type: 'warning' | 'danger' | 'info' | 'success'
  const configs = {
    warning: { bg: 'FEF9E7', border: C.warning, icon: '⚠', titleColor: C.warning },
    danger:  { bg: 'FDEDEC', border: C.danger,  icon: '🚫', titleColor: C.danger  },
    info:    { bg: 'EAF4FB', border: C.accent,  icon: 'ℹ',  titleColor: C.accent  },
    success: { bg: 'EAFAF1', border: C.success, icon: '✔',  titleColor: C.success },
  };
  const cfg = configs[type] || configs.info;

  const rows = [
    new TableRow({
      children: [
        new TableCell({
          borders: allBorders(cfg.border),
          shading: { fill: cfg.bg, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 40, left: 180, right: 180 },
          width: { size: 9360, type: WidthType.DXA },
          children: [
            new Paragraph({
              spacing: { before: 0, after: 80 },
              children: [new TextRun({ text: `${cfg.icon}  ${title}`, font: 'Arial', size: 22, bold: true, color: cfg.titleColor })]
            }),
            ...lines.map(line => new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [new TextRun({ text: line, font: 'Arial', size: 19, color: '2C3E50' })]
            }))
          ]
        })
      ]
    })
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows
  });
}

function sectionDivider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.border, space: 1 } },
    children: [new TextRun('')]
  });
}

function codeBlock(lines) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: allBorders('AAB7B8'),
            shading: { fill: '1C2833', type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: lines.map(line => new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [new TextRun({ text: line, font: 'Courier New', size: 18, color: '1ABC9C' })]
            }))
          })
        ]
      })
    ]
  });
}

// --- Pin table helper ---
function pinTable(headers, rows, colWidths) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => new TableCell({
          borders: allBorders(C.accent),
          shading: { fill: C.headerBg, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          width: { size: colWidths[i], type: WidthType.DXA },
          children: [new Paragraph({
            children: [new TextRun({ text: h, font: 'Arial', size: 19, bold: true, color: C.white })]
          })]
        }))
      }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map((cell, ci) => new TableCell({
          borders: allBorders(C.border),
          shading: { fill: ri % 2 === 0 ? C.white : C.gray, type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          width: { size: colWidths[ci], type: WidthType.DXA },
          children: [new Paragraph({
            children: [new TextRun({ text: cell, font: 'Arial', size: 18, color: '1C2833', bold: ci === 0 })]
          })]
        }))
      }))
    ]
  });
}

// =====================================================================
// DOCUMENT CONTENT
// =====================================================================

const children = [];

// ---- COVER PAGE ----
children.push(
  new Paragraph({
    spacing: { before: 1200, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'RLIGHT', font: 'Arial', size: 72, bold: true, color: C.primary })]
  }),
  new Paragraph({
    spacing: { before: 60, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Portaria Autônoma', font: 'Arial', size: 48, color: C.accent })]
  }),
  new Paragraph({
    spacing: { before: 180, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', font: 'Arial', size: 24, color: C.accent2 })]
  }),
  new Paragraph({
    spacing: { before: 180, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'MANUAL DE INSTALAÇÃO DE HARDWARE', font: 'Arial', size: 36, bold: true, color: C.primary })]
  }),
  new Paragraph({
    spacing: { before: 80, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Versão 7 — Edição Industrial', font: 'Arial', size: 26, color: C.darkGray, italics: true })]
  }),
  new Paragraph({
    spacing: { before: 600, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Documento Normativo de Engenharia', font: 'Arial', size: 22, bold: true, color: C.darkGray })]
  }),
  new Paragraph({
    spacing: { before: 60, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Diagramas de Fiação · Lista de Materiais · Chicotes de Rede · Proteção Elétrica', font: 'Arial', size: 20, color: C.darkGray })]
  }),
  new Paragraph({
    spacing: { before: 800, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'rlight.com.br', font: 'Arial', size: 22, color: C.accent, bold: true })]
  }),
  new Paragraph({
    spacing: { before: 60, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Maio / 2026', font: 'Arial', size: 20, color: C.darkGray })]
  }),
  pageBreak()
);

// ---- ALERTAS CRÍTICOS ----
children.push(
  h1('⚡ Alertas Críticos — Leia Antes de Qualquer Coisa'),
  spacer(120),
  callout('danger', 'PROTOCOLO WIEGAND DESCONTINUADO (Maio/2026)', [
    'O acesso via teclado foi completamente reformulado. O protocolo Wiegand foi abandonado.',
    'O Teclado Matricial 4x3 agora se comunica exclusivamente via Expansor I2C (PCF8574).',
    'Qualquer documentação anterior referenciando Wiegand está obsoleta e NÃO deve ser usada.',
  ]),
  spacer(120),
  callout('danger', 'PINOS GPIO PROIBIDOS NO ESP32-S3 WROOM-2 N8R8', [
    'Os pinos GPIO 33 ao 37 são ABSOLUTAMENTE PROIBIDOS neste módulo.',
    'Esses pinos estão internamente ligados à Octal PSRAM (8MB) e qualquer uso causa KERNEL PANIC.',
    'Os botões foram remapeados para os pinos seguros: 4 (Reed P1), 5 (Reed P2) e 7 (Botão Metálico).',
    'Verifique sempre o mapa de pinos deste documento antes de qualquer conexão.',
  ]),
  spacer(120),
  callout('warning', 'DESCONECTE O GM861S NO PRIMEIRO FLASH', [
    'Os pinos GPIO 43 (TX) e 44 (RX) são usados pelo Bootloader do ESP32 durante o processo de flash.',
    'O scanner GM861S está ligado a esses pinos. Desconecte o módulo fisicamente antes do primeiro upload.',
    'Após o firmware ser gravado com sucesso, reconecte normalmente.',
  ]),
  pageBreak()
);

// ---- SUMÁRIO ----
children.push(
  h1('Sumário'),
  para('Este manual cobre todos os aspectos da montagem física da Portaria RLight v7:'),
  spacer(80),
  ...([
    ['1', 'Visão Geral do Sistema e Topologia de Ambientes'],
    ['2', 'Bill of Materials (Lista de Componentes)'],
    ['3', 'Ambiente C — Núcleo Interno (Quadro de Comando)'],
    ['4', 'O Umbilical da Fachada — Conector Aviação GX16 de 16 Pinos'],
    ['5', 'Conectores Aviação 6-Pinos (Periféricos)'],
    ['6', 'Pinagem Detalhada de Cada Módulo'],
    ['7', 'Proteção Elétrica e Integridade de Barramento'],
    ['8', 'Checklist de Instalação'],
  ].map(([num, title]) => new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: `${num}.  `, font: 'Arial', size: 21, bold: true, color: C.accent }),
      new TextRun({ text: title, font: 'Arial', size: 21, color: '1C2833' }),
    ]
  }))),
  pageBreak()
);

// ---- SEÇÃO 1: VISÃO GERAL ----
children.push(
  h1('1. Visão Geral do Sistema e Topologia de Ambientes'),
  para('O RLight Portaria Autônoma v7 é um sistema distribuído de controle de acesso e logística de entrega projetado para residências e condomínios. Combina hardware de automação industrial com software moderno baseado em WebSockets e criptografia JWT.'),
  spacer(100),

  h2('1.1. Filosofia de Projeto'),
  para('O sistema opera sob o paradigma de Processamento Assimétrico (AMP) via FreeRTOS, com dois núcleos do ESP32-S3 com funções distintas e complementares:'),
  spacer(80),
  bullet('Core 1 (taskSensorHub @ 50Hz): Polling contínuo de todos os sensores físicos — balança HX711, radar LD2410B, leitor QR GM861S e teclado via PCF8574.', 0, false),
  bullet('Core 0 (taskLogicBrain @ 100Hz): Execução da StateMachine preemptiva, criptografia JWT e processamento dos eventos WebSocket via Native USB CDC.', 0, false),
  spacer(120),

  h2('1.2. Topologia dos Três Ambientes'),
  spacer(80),

  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1560, 2400, 5400],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ borders: allBorders(C.accent), shading: { fill: C.headerBg, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 140, right: 140 }, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Ambiente', font: 'Arial', size: 20, bold: true, color: C.white })] })] }),
          new TableCell({ borders: allBorders(C.accent), shading: { fill: C.headerBg, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 140, right: 140 }, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Localização', font: 'Arial', size: 20, bold: true, color: C.white })] })] }),
          new TableCell({ borders: allBorders(C.accent), shading: { fill: C.headerBg, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 140, right: 140 }, width: { size: 5400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Componentes', font: 'Arial', size: 20, bold: true, color: C.white })] })] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: allBorders(C.border), shading: { fill: 'EAF4FB', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'A', font: 'Arial', size: 21, bold: true, color: C.primary })] })] }),
          new TableCell({ borders: allBorders(C.border), shading: { fill: 'EAF4FB', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Fachada Externa (Rua)', font: 'Arial', size: 19, color: '1C2833' })] })] }),
          new TableCell({ borders: allBorders(C.border), shading: { fill: 'EAF4FB', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, width: { size: 5400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Tela LCD 7", Leitor GM861S, Teclado 4x3 + PCF8574, Botão Metálico LED, Buzzer', font: 'Arial', size: 19, color: '1C2833' })] })] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: allBorders(C.border), shading: { fill: C.white, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'B', font: 'Arial', size: 21, bold: true, color: C.primary })] })] }),
          new TableCell({ borders: allBorders(C.border), shading: { fill: C.white, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Porta / Grade (Medio)', font: 'Arial', size: 19, color: '1C2833' })] })] }),
          new TableCell({ borders: allBorders(C.border), shading: { fill: C.white, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, width: { size: 5400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Travas Strike 12V (P1 e P2) + Reed Switches + Diodos Flyback 1N4007', font: 'Arial', size: 19, color: '1C2833' })] })] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: allBorders(C.border), shading: { fill: 'EAF4FB', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, width: { size: 1560, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'C', font: 'Arial', size: 21, bold: true, color: C.primary })] })] }),
          new TableCell({ borders: allBorders(C.border), shading: { fill: 'EAF4FB', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Central Interna (Quadro Hermético)', font: 'Arial', size: 19, color: '1C2833' })] })] }),
          new TableCell({ borders: allBorders(C.border), shading: { fill: 'EAF4FB', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, width: { size: 5400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Orange Pi Zero 3, ESP32-S3 (Breakout 38 pinos), Fontes Mean Well, Relés, INA219 x2, Cooler 40mm', font: 'Arial', size: 19, color: '1C2833' })] })] }),
        ]
      }),
    ]
  }),

  spacer(200),
  callout('info', 'Comunicação entre Ambientes', [
    'A → C: Todo o cabeamento do Ambiente A passa pelo Conector Aviação GX16 de 16 pinos (exceto o cabo micro-HDMI da tela, que tem tubulação própria).',
    'B → C: Fechaduras e reed switches chegam via Chicotes RJ45 blindados (Chicotes 3 e 4).',
    'C ↔ ESP32: Orange Pi se comunica com o ESP32-S3 via Native USB CDC (GPIO 19/20). Wi-Fi é proibido.',
  ]),
  pageBreak()
);

// ---- SEÇÃO 2: LISTA DE MATERIAIS ----
children.push(
  h1('2. Bill of Materials (BoM) — Lista Completa de Componentes'),
  para('Abaixo a lista completa e exata de cada componente necessário para a construção da instalação RLight v7.'),
  spacer(100),

  h2('2.1. Processamento e Lógica'),
  spacer(80),
  pinTable(
    ['Qtd.', 'Componente', 'Especificação Técnica', 'Função no Sistema'],
    [
      ['1x', 'Orange Pi Zero 3', 'Allwinner H618, 1.5GHz, 2GB LPDDR4', 'SBC principal — roda Linux, FastAPI, SPA Web'],
      ['1x', 'ESP32-S3 WROOM-2 N8R8', '8MB PSRAM Octal, 8MB Flash', 'Microcontrolador I/O — sensores e atuadores'],
      ['1x', 'Breakout Board 38 Pinos', 'Bornes a parafuso para ESP32', 'Facilita fiação sem soldagem'],
      ['1x', 'MicroSD 32GB Classe 10 A1', 'SanDisk High Endurance (preferencial)', 'Sistema operacional da Orange Pi'],
    ],
    [900, 2400, 3060, 3000]
  ),
  spacer(160),

  h2('2.2. Sensores e Módulos de Comunicação'),
  spacer(80),
  pinTable(
    ['Qtd.', 'Componente', 'Modelo Exato', 'Função'],
    [
      ['1x', 'Leitor QR/Barras', 'Hangzhou Grow GM861S', 'Leitura dos códigos de entrega (UART TTL)'],
      ['1x', 'Radar mmWave', 'Hi-Link LD2410B 24GHz', 'Detecção de presença na fachada'],
      ['1x', 'Teclado Matricial', 'Membrana/ABS 4x3 — 12 teclas', 'Entrada de senha por moradores'],
      ['1x', 'Expansor I2C', 'PCF8574', 'Converte 7 fios do teclado em barramento I2C'],
      ['1x', 'Amplificador A/D', 'HX711 — 24 bits', 'Interface com as células de carga (balança)'],
      ['4x', 'Células de Carga', 'Strain Gauge 50kg cada', 'Ponte de Wheatstone — 200kg total'],
      ['2x', 'Sensor Corrente/Tensão', 'Texas Instruments INA219', 'Anti-sabotagem das travas eletromagnéticas'],
      ['3x', 'Sensor Magnético', 'Reed Switch NA com imã', 'Sensores de porta P1, P2 e Portão'],
    ],
    [600, 2200, 2360, 4200]
  ),
  spacer(160),

  h2('2.3. Atuadores e Interface'),
  spacer(80),
  pinTable(
    ['Qtd.', 'Componente', 'Especificação', 'Função'],
    [
      ['1x', 'Display LCD TFT 7"', '1024x600, interface micro-HDMI', 'Interface visual da portaria'],
      ['1x', 'Módulo Relé 1 Canal', 'Isolamento galvânico', 'Pulso na botoeira do Motor do Portão'],
      ['2x', 'Módulo MOSFET', 'Placa de Isolamento Óptico', 'Acionamento das travas Strike P1 e P2'],
      ['2x', 'Trava Strike Fail-Secure', '12V — abre apenas com pulso elétrico', 'Fechamento físico das portas P1 e P2'],
      ['1x', 'Botão Push-Button Metálico', '16–19mm NA, LED Halo 5V/12V', 'Acionamento manual na calçada'],
      ['1x', 'Botão Push-Button Simples', 'Plástico/NA', 'Botão interno de saída da P2'],
      ['1x', 'Buzzer Ativo 5V', 'Buzzer ativo (auto-oscilante)', 'Alertas sonoros do sistema'],
      ['1x', 'Cooler 40x40x10mm', 'DC 12V com filtro de poeira', 'Refrigeração do quadro C (Mosfet)'],
      ['2x', 'Diodo Retificador 1N4007', '1N4007 (flyback)', 'Proteção contra transiente das travas'],
    ],
    [600, 2400, 2360, 4000]
  ),
  spacer(160),

  h2('2.4. Infraestrutura e Energia'),
  spacer(80),
  pinTable(
    ['Qtd.', 'Componente', 'Modelo/Spec', 'Função'],
    [
      ['1x', 'Fonte Lógica 5V/5A', 'Mean Well RS-25-5', 'Alimenta Orange Pi, ESP32, periféricos A'],
      ['1x', 'Fonte Potência 12V/4.2A', 'Mean Well RS-50-12', 'Alimenta travas Strike e cooler 40mm'],
      ['1x', 'Conector Aviação GX16', '16 pinos — par macho+fêmea', 'Umbilical do Ambiente A → C'],
      ['5x', 'Conector Aviação 6 pinos', 'Macho de painel + Fêmea', 'Umbilical dos chicotes periféricos'],
      ['--', 'Cabo Cat5e FTP', 'Blindado (STP), por metro', 'Chicotes aviação para periféricos'],
      ['2x', 'Resistor 4.7kΩ', '1/4W', 'Pull-up I2C (SDA e SCL)'],
      ['4+x', 'Capacitor Cerâmico 100nF', '50V ou mais', 'Bypass nos chips PCF8574 e INA219'],
      ['1x', 'Resistor 220Ω', '1/4W', 'Limitador de corrente do LED Halo botão'],
    ],
    [600, 2200, 2560, 4000]
  ),
  pageBreak()
);

// ---- SEÇÃO 3: AMBIENTE C ----
children.push(
  h1('3. Ambiente C — O Núcleo do Sistema (Quadro de Comando)'),
  para('O Ambiente C é o coração físico da instalação. Um quadro hermético (IP65 recomendado), instalado na área interna da edificação, contém toda a lógica, energia e comunicação do sistema.'),
  spacer(120),

  h2('3.1. Layout Interno do Quadro'),
  para('A organização interna deve seguir a seguinte hierarquia:'),
  spacer(80),
  bullet('Painel traseiro: Fontes Mean Well fixadas com trilho DIN ou parafusos M4.'),
  bullet('Centro esquerdo: Orange Pi Zero 3 com cabo de rede Cat5e rígido para a rede.'),
  bullet('Centro direito: Breakout Board 38 pinos com o módulo ESP32-S3 encaixado.'),
  bullet('Painel frontal: Módulos MOSFET, Módulo Relé 1 Canal, INA219 x2 e barramento de conectores de aviação.'),
  bullet('Lateral inferior: Cooler 40mm com filtro de poeira (ar entrando de baixo para cima).'),
  spacer(120),

  h2('3.2. Arquitetura de Energia'),
  spacer(80),

  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2800, 3280, 3280],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({ borders: allBorders(C.accent), shading: { fill: C.headerBg, type: ShadingType.CLEAR }, margins: { top: 90, bottom: 90, left: 130, right: 130 }, width: { size: 2800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Fonte', font: 'Arial', size: 19, bold: true, color: C.white })] })] }),
          new TableCell({ borders: allBorders(C.accent), shading: { fill: C.headerBg, type: ShadingType.CLEAR }, margins: { top: 90, bottom: 90, left: 130, right: 130 }, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Tensão / Corrente', font: 'Arial', size: 19, bold: true, color: C.white })] })] }),
          new TableCell({ borders: allBorders(C.accent), shading: { fill: C.headerBg, type: ShadingType.CLEAR }, margins: { top: 90, bottom: 90, left: 130, right: 130 }, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Alimenta', font: 'Arial', size: 19, bold: true, color: C.white })] })] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: allBorders(C.border), shading: { fill: C.white, type: ShadingType.CLEAR }, margins: { top: 70, bottom: 70, left: 130, right: 130 }, width: { size: 2800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Mean Well RS-25-5', font: 'Arial', size: 19, bold: true, color: C.primary })] })] }),
          new TableCell({ borders: allBorders(C.border), shading: { fill: C.white, type: ShadingType.CLEAR }, margins: { top: 70, bottom: 70, left: 130, right: 130 }, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: '5V / 5A (25W)', font: 'Arial', size: 19, color: '1C2833' })] })] }),
          new TableCell({ borders: allBorders(C.border), shading: { fill: C.white, type: ShadingType.CLEAR }, margins: { top: 70, bottom: 70, left: 130, right: 130 }, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Orange Pi, Breakout ESP32, GM861S, PCF8574, Tela 7" (DC), Buzzer', font: 'Arial', size: 19, color: '1C2833' })] })] }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ borders: allBorders(C.border), shading: { fill: C.gray, type: ShadingType.CLEAR }, margins: { top: 70, bottom: 70, left: 130, right: 130 }, width: { size: 2800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Mean Well RS-50-12', font: 'Arial', size: 19, bold: true, color: C.primary })] })] }),
          new TableCell({ borders: allBorders(C.border), shading: { fill: C.gray, type: ShadingType.CLEAR }, margins: { top: 70, bottom: 70, left: 130, right: 130 }, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: '12V / 4.2A (50W)', font: 'Arial', size: 19, color: '1C2833' })] })] }),
          new TableCell({ borders: allBorders(C.border), shading: { fill: C.gray, type: ShadingType.CLEAR }, margins: { top: 70, bottom: 70, left: 130, right: 130 }, width: { size: 3280, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Travas Strike P1 e P2, Cooler 40mm 12V', font: 'Arial', size: 19, color: '1C2833' })] })] }),
        ]
      }),
    ]
  }),

  spacer(160),
  callout('warning', 'Terra Comum Obrigatório', [
    'O GND da Fonte 5V e o GND da Fonte 12V DEVEM ser interligados fisicamente.',
    'Use um borne dedicado no quadro C para criar o "Terra Comum" compartilhado pela Breakout Board.',
    'Sem terra comum, diferenças de potencial geram ruído elétrico que compromete I2C e UART.',
  ]),
  spacer(120),

  h2('3.3. Comunicação Orange Pi ↔ ESP32-S3 (Native USB CDC)'),
  para('A comunicação entre o SBC e o microcontrolador usa o barramento USB nativo do ESP32-S3, sem adaptador FTDI externo. O cabo deve ter os condutores de dados fisicamente descascados e terminados nos bornes da Breakout Board.'),
  spacer(80),
  pinTable(
    ['Sinal USB', 'Fio do Cabo', 'GPIO ESP32-S3', 'Observação'],
    [
      ['D−  (USB Data Minus)', 'Branco', 'GPIO 19', 'Native USB CDC D−'],
      ['D+  (USB Data Plus)', 'Verde', 'GPIO 20', 'Native USB CDC D+'],
      ['VCC', 'Vermelho', 'Não conectar', 'Orange Pi já é alimentada separadamente'],
      ['GND', 'Preto', 'GND Breakout', 'Terra comum'],
    ],
    [2400, 2000, 2400, 2560]
  ),
  spacer(120),

  h2('3.4. Cooler 40mm — Controle pelo ESP32'),
  para('O cooler de 40mm deve ser montado na lateral inferior do quadro injetando ar frio de fora para dentro. A saída de ar quente deve ter abertura na parte superior.'),
  spacer(80),
  bullet('VCC (12V): Ligado à saída Dreno do Módulo MOSFET.'),
  bullet('GND: Ligado ao terminal negativo da Fonte 12V.'),
  bullet('Controle: GPIO 47 do ESP32-S3 aciona o gate do MOSFET correspondente.'),
  spacer(100),
  callout('info', 'Lógica de Controle do Cooler', [
    'O ESP32 monitora a temperatura interna do próprio chip via sensor integrado.',
    'O cooler é ligado automaticamente quando a temperatura ultrapassa o limiar configurado.',
    'Em caso de falha do sensor, o firmware ativa o cooler permanentemente por segurança.',
  ]),
  pageBreak()
);

// ---- SEÇÃO 4: CONECTOR AVIAÇÃO ----
children.push(
  h1('4. O Umbilical da Fachada — Conector Aviação GX16 de 16 Pinos'),
  para('O Conector Circular de Aviação GX16 é o único ponto de passagem entre o Ambiente A (fachada) e o Ambiente C (quadro interno). Todo sinal elétrico, alimentação lógica e comunicação serial passa por esses 16 pinos.'),
  spacer(80),
  callout('info', 'Cabo de Vídeo Separado', [
    'O cabo micro-HDMI da Tela LCD 7" possui blindagem própria e DEVE ser passado em tubulação separada.',
    'Nunca junte o cabo HDMI ao chicote do GX16 — interferência eletromagnética degrada a imagem.',
  ]),
  spacer(120),

  h2('4.1. Mapeamento Absoluto dos 16 Pinos'),
  spacer(80),

  pinTable(
    ['Pino', 'Sinal / Nome', 'GPIO ESP32-S3', 'Conecta a', 'Observação'],
    [
      ['1', 'Livre / Reserva', '—', '—', 'Antigo USB D+ (descontinuado)'],
      ['2', 'Livre / Reserva', '—', '—', 'Antigo USB D− (descontinuado)'],
      ['3', 'UART0 RX', 'GPIO 44', 'GM861S TXD', 'Dados de QR Code recebidos'],
      ['4', 'UART0 TX', 'GPIO 43', 'GM861S RXD', 'Comandos enviados ao scanner'],
      ['5', 'I2C SDA', 'GPIO 21', 'PCF8574 SDA', 'Barramento I2C — dado'],
      ['6', 'I2C SCL', 'GPIO 38', 'PCF8574 SCL', 'Barramento I2C — clock'],
      ['7', 'KEYPAD INT', 'GPIO 6', 'PCF8574 INT', 'Interrupção Active LOW ao pressionar tecla'],
      ['8', 'LED BTN', 'GPIO 39', 'Halo Ring Botão', 'Via resistor 220Ω em série'],
      ['9', 'LED QR', 'GPIO 40', 'Ilum. auxiliar GM861S', 'Pino auxiliar de iluminação do leitor'],
      ['10', 'BUZZER', 'GPIO 48', 'Buzzer Ativo 5V', 'I/O direto ou via transistor'],
      ['11', 'BUTTON', 'GPIO 7', 'Contato NA Botão', 'Puxado ao GND quando pressionado'],
      ['12', 'GND Lógica', '—', 'Terra Geral 5V', 'Terra principal'],
      ['13', 'GND Lógica Reforço', '—', 'Terra / Malha Cat5e', 'Segunda referência — blindagem do cabo'],
      ['14', 'VCC 5V Lógica', '—', 'GM861S VCC, PCF8574 VCC, Tela', 'Alimentação principal do Ambiente A'],
      ['15', 'VCC 5V Reforço', '—', 'Reforço de corrente 5V', 'Cabo em paralelo para reduzir queda de tensão'],
      ['16', 'Livre / Reserva', '—', '—', 'Para expansão futura'],
    ],
    [600, 1900, 1700, 2200, 2960]
  ),

  spacer(160),
  callout('warning', 'Boas Práticas de Instalação do GX16', [
    'Use cabo multipolar blindado (ex: cabo de controle 16 vias) dentro da tubulação.',
    'Conecte a malha do cabo blindado ao Pino 13 (GND Reforço) em apenas UMA extremidade (lado C) para evitar laço de terra.',
    'Realize continuidade elétrica com multímetro em todos os 14 pinos ativos antes de energizar.',
    'Torque do conector: aperte o anel de travamento GX16 firmemente com ferramenta adequada — vibração solta conectores parcialmente encaixados.',
  ]),
  pageBreak()
);

// ---- SEÇÃO 5: CHICOTES PERIFÉRICOS ----
children.push(
  h1('5. Conectores Aviação 6-Pinos (Periféricos Isolados)'),
  para('Os periféricos do Ambiente B e os módulos isolados usam cabos de rede Cat5e FTP soldados em conectores GX16 de 6 pinos no Painel C. Esta solução garante fixação mecânica robusta.'),
  spacer(100),

  h2('5.1. Chicote 1 — Radar mmWave Hi-Link LD2410B'),
  para('O LD2410B detecta presença humana por ondas milimétricas de 24GHz, distinguindo alvos em movimento e estáticos. Possui 5 pinos funcionais, usamos 4.'),
  spacer(80),
  pinTable(
    ['Pino Aviação 6-pin', 'Sinal', 'Conecta a (LD2410B)', 'GPIO ESP32-S3'],
    [
      ['Pino 1', 'VCC', 'VCC (5V)', '— (Fonte 5V)'],
      ['Pino 2', 'GND', 'GND', '— (Terra)'],
      ['Pino 3', 'RX', 'RX do Radar', 'GPIO 17 (UART1 TX)'],
      ['Pino 4', 'TX', 'TX do Radar', 'GPIO 18 (UART1 RX)'],
      ['Pino 5 e 6', 'NC', '—', 'Não utilizado'],
    ],
    [2400, 1300, 2800, 2860]
  ),
  spacer(80),
  callout('info', 'Sobre o pino OUT do LD2410B', [
    'O pino OUT do radar foi ignorado nesta implementação.',
    'O sistema usa o protocolo UART serial completo do LD2410B para obter distâncias e alvos dinâmicos com resolução centimétrica, que é superior ao simples sinal digital do pino OUT.',
  ]),
  spacer(140),

  h2('5.2. Chicote 2 — Balança HX711 + Células de Carga'),
  para('A balança usa quatro células de carga de 50kg cada, formando uma Ponte de Wheatstone para suportar até 200kg. O amplificador HX711 DEVE ficar fisicamente junto das células (na base da balança) para evitar ruído no sinal analógico. Do HX711, envia-se apenas sinal digital.'),
  spacer(80),

  h3('Fiação das Células de Carga → HX711 (na base da balança)'),
  spacer(60),
  pinTable(
    ['Terminal HX711', 'Fio da Célula', 'Descrição'],
    [
      ['E+', 'Vermelho', 'Excitation Positive — tensão de referência +'],
      ['E−', 'Preto', 'Excitation Negative — tensão de referência −'],
      ['A−', 'Branco', 'Signal Negative — sinal diferencial −'],
      ['A+', 'Verde', 'Signal Positive — sinal diferencial +'],
    ],
    [2200, 2200, 4960]
  ),
  spacer(120),

  h3('Chicote Aviação — HX711 → Painel C'),
  spacer(60),
  pinTable(
    ['Pino Aviação 6-pin', 'Sinal', 'Conecta a (HX711)', 'GPIO ESP32-S3'],
    [
      ['Pino 1', 'VCC', 'VCC (5V)', '— (Fonte 5V)'],
      ['Pino 2', 'GND', 'GND', '— (Terra)'],
      ['Pino 3', 'SCK', 'SCK (Clock)', 'GPIO 41'],
      ['Pino 4', 'DT', 'DT  (Data)', 'GPIO 42'],
      ['Pino 5 e 6', 'NC', '—', 'Não utilizado'],
    ],
    [2400, 1300, 2800, 2860]
  ),
  spacer(140),

  h2('5.3. Chicotes 3, 4 e 5 — Fechaduras e Portão'),
  para('Cada porta tem seu conector aeronáutico dedicado.'),
  spacer(80),
  pinTable(
    ['Pino Aviação', 'Chicote 3 (Trava P1)', 'Chicote 4 (Trava P2 + Botão)', 'Chicote 5 (Portão)'],
    [
      ['Pino 1', 'Strike VCC (+12V)', 'Strike VCC (+12V)', 'Relé NO (Botoeira)'],
      ['Pino 2', 'Strike GND (Dreno MOSFET)', 'Strike GND (Dreno MOSFET)', 'Relé COM (Comum Botoeira)'],
      ['Pino 3', 'Reed P1 GND', 'Reed e Botão P2 GND (Lógica)', 'Reed Portão GND'],
      ['Pino 4', 'Reed P1 Sinal (GPIO 4)', 'Reed P2 Sinal (GPIO 5)', 'Reed Portão Sinal (GPIO 13)'],
      ['Pino 5', 'NC', 'Botão Saída Sinal (GPIO 12)', 'NC'],
      ['Pino 6', 'NC', 'NC', 'NC'],
    ],
    [1600, 2580, 2580, 2600]
  ),
  spacer(100),
  callout('warning', 'Como funciona o Reed Switch e Botão P2', [
    'O Reed Switch é puxado ao GND quando a porta é fechada ou aberta.',
    'O Botão Interno da P2 (GPIO 12) viaja no mesmo cabo da P2 (Pino 5 do conector 4).',
    'O Portão usa um relé isolado nos pinos 1 e 2 do conector 5 para simular o pulso físico do botão na central Garen.',
  ]),
  pageBreak()
);

// ---- SEÇÃO 6: PINAGEM DETALHADA ----
children.push(
  h1('6. Pinagem Detalhada de Cada Módulo'),
  spacer(80),

  h2('6.1. Leitor QR Code — Hangzhou Grow GM861S'),
  para('O GM861S usa comunicação UART TTL. Seus pinos cruzam pelo Conector Aviação GX16. O módulo opera em 5V.'),
  spacer(80),
  pinTable(
    ['Pino GM861S', 'Conecta a', 'Pino Aviação GX16', 'GPIO ESP32-S3'],
    [
      ['VCC', 'VCC 5V Lógica', 'Pino 14 (e 15)', '— (Fonte)'],
      ['GND', 'Terra Geral', 'Pino 12 (e 13)', '— (Terra)'],
      ['RXD', 'UART0 TX do ESP32', 'Pino 4', 'GPIO 43'],
      ['TXD', 'UART0 RX do ESP32', 'Pino 3', 'GPIO 44'],
    ],
    [2200, 2600, 2200, 2360]
  ),
  spacer(80),
  callout('danger', 'ATENÇÃO — Primeiro Flash', [
    'GPIO 43 e 44 são o canal serial primário do Bootloader do ESP32.',
    'DESCONECTE o GM861S antes de realizar o primeiro upload de firmware.',
    'Após o flash concluído, reconecte normalmente.',
  ]),
  spacer(140),

  h2('6.2. Teclado Matricial 4x3 e Expansor PCF8574'),
  para('O PCF8574 elimina a necessidade de 7 GPIOs dedicados ao teclado, substituindo-os por apenas 2 fios I2C e 1 linha de interrupção. O pino INT sinaliza Active LOW quando qualquer tecla é pressionada.'),
  spacer(80),

  h3('Fiação Teclado → PCF8574'),
  spacer(60),
  pinTable(
    ['Fio do Teclado', 'Terminal PCF8574', 'Descrição'],
    [
      ['Linha 1', 'P0', 'Linha superior do teclado'],
      ['Linha 2', 'P1', 'Segunda linha'],
      ['Linha 3', 'P2', 'Terceira linha'],
      ['Linha 4', 'P3', 'Linha inferior'],
      ['Coluna 1', 'P4', 'Coluna esquerda (1, 4, 7, *)'],
      ['Coluna 2', 'P5', 'Coluna central (2, 5, 8, 0)'],
      ['Coluna 3', 'P6', 'Coluna direita (3, 6, 9, #)'],
    ],
    [2600, 2600, 4160]
  ),
  spacer(120),

  h3('Fiação PCF8574 → Conector Aviação GX16'),
  spacer(60),
  pinTable(
    ['Terminal PCF8574', 'Pino Aviação', 'GPIO ESP32-S3', 'Observação'],
    [
      ['VCC', 'Pino 14 (5V)', '—', 'Alimentação do expansor'],
      ['GND', 'Pino 12 (GND)', '—', 'Terra'],
      ['SDA', 'Pino 5', 'GPIO 21', 'I2C Data — com pull-up 4.7kΩ para 3.3V'],
      ['SCL', 'Pino 6', 'GPIO 38', 'I2C Clock — com pull-up 4.7kΩ para 3.3V'],
      ['INT', 'Pino 7', 'GPIO 6', 'Interrupção — Active LOW na tecla pressionada'],
      ['A0, A1, A2', '—', '—', 'Endereço I2C: ligar ao GND para endereço 0x20 padrão'],
    ],
    [2200, 1700, 2000, 3460]
  ),
  spacer(140),

  h2('6.3. Monitores de Corrente INA219 (x2) — Anti-Sabotagem'),
  para('Os dois módulos INA219 ficam no Painel C e monitoram em tempo real a corrente que flui para cada trava. Se o relé disparar mas nenhuma corrente for detectada (relé preso, fio rompido ou sabotagem), o firmware gera alerta crítico imediato.'),
  spacer(80),
  pinTable(
    ['Terminal INA219', 'Conecta a', 'Endereço I2C', 'Observação'],
    [
      ['VCC', '3.3V da Breakout ESP32', 'Ambos', 'Lógica 3.3V apenas'],
      ['GND', 'Terra Geral', 'Ambos', 'Terra comum'],
      ['SDA', 'GPIO 21 (paralelo com PCF8574)', 'Ambos', 'Mesmo barramento I2C'],
      ['SCL', 'GPIO 38 (paralelo com PCF8574)', 'Ambos', 'Mesmo barramento I2C'],
      ['Vin+', 'Positivo 12V da Fonte (entrada)', '0x40 (P1) / 0x41 (P2)', 'Circuito de potência 12V'],
      ['Vin−', 'Fio rumo à Strike (saída)', '0x40 (P1) / 0x41 (P2)', 'Shunt de medição em série'],
      ['pad A0', 'Soldar ponte (jumper)', '0x41 apenas (P2)', 'OBRIGATÓRIO para endereço alternativo'],
    ],
    [2200, 2800, 2000, 2360]
  ),
  spacer(80),
  callout('danger', 'Configuração de Endereço do INA219 P2', [
    'É OBRIGATÓRIO soldar a ponte (jumper) no pad A0 da placa do INA219 destinado à porta P2.',
    'Sem isso, ambos os chips terão o endereço 0x40 e haverá conflito de barramento I2C.',
    'INA219 P1: endereço 0x40 (padrão, nenhuma modificação).',
    'INA219 P2: endereço 0x41 (soldar pad A0 ao GND ou VCC — veja o datasheet do módulo).',
  ]),
  spacer(120),

  h2('6.4. Tabela Mestre de GPIOs do ESP32-S3'),
  para('Referência consolidada de todos os pinos em uso. GPIOs 33-37 são PROIBIDOS.'),
  spacer(80),
  pinTable(
    ['GPIO', 'Sinal / Função', 'Direção', 'Periférico'],
    [
      ['GPIO 4',  'Reed Switch P1',           'INPUT_PULLUP', 'Sensor magnético Porta 1'],
      ['GPIO 5',  'Reed Switch P2',           'INPUT_PULLUP', 'Sensor magnético Porta 2'],
      ['GPIO 13', 'Reed Switch Portão',       'INPUT_PULLUP', 'Sensor magnético Portão Garen'],
      ['GPIO 12', 'Botão Saída P2',           'INPUT_PULLUP', 'Botão de destravamento interno'],
      ['GPIO 14', 'Relé Portão Garen',        'OUTPUT',       'Pulso de contato seco NO/COM'],
      ['GPIO 6',  'PCF8574 INT',              'INPUT_PULLUP', 'Interrupção do teclado matricial'],
      ['GPIO 7',  'Botão Metálico NA',        'INPUT_PULLUP', 'Botão externo na fachada'],
      ['GPIO 17', 'UART1 TX → LD2410B RX',   'OUTPUT',       'Radar mmWave — comando'],
      ['GPIO 18', 'UART1 RX ← LD2410B TX',   'INPUT',        'Radar mmWave — dado'],
      ['GPIO 19', 'USB D−',                   'USB',          'Native USB CDC (Orange Pi)'],
      ['GPIO 20', 'USB D+',                   'USB',          'Native USB CDC (Orange Pi)'],
      ['GPIO 21', 'I2C SDA',                  'I2C',          'PCF8574, INA219 x2'],
      ['GPIO 38', 'I2C SCL',                  'I2C',          'PCF8574, INA219 x2'],
      ['GPIO 39', 'LED Halo Botão',           'OUTPUT',       'Via resistor 220Ω'],
      ['GPIO 40', 'LED QR (auxiliar)',         'OUTPUT',       'Iluminação extra GM861S'],
      ['GPIO 41', 'HX711 SCK (Clock)',        'OUTPUT',       'Balança — clock do amplificador'],
      ['GPIO 42', 'HX711 DT  (Data)',         'INPUT',        'Balança — dado serial 24 bits'],
      ['GPIO 43', 'UART0 TX → GM861S RXD',   'OUTPUT',       'Leitor QR — comando'],
      ['GPIO 44', 'UART0 RX ← GM861S TXD',   'INPUT',        'Leitor QR — dado'],
      ['GPIO 47', 'Relé Cooler 40mm',         'OUTPUT',       'Controle de temperatura do quadro'],
      ['GPIO 48', 'Buzzer Ativo 5V',          'OUTPUT',       'Alertas sonoros externos'],
      ['GPIO 33-37', '⛔ PROIBIDOS',         '—',            'Conectados internamente à PSRAM Octal'],
    ],
    [1300, 2700, 1900, 3460]
  ),
  pageBreak()
);

// ---- SEÇÃO 7: PROTEÇÃO ELÉTRICA ----
children.push(
  h1('7. Proteção Elétrica e Integridade de Barramento'),
  spacer(80),

  h2('7.1. Diodo Flyback 1N4007 — Proteção das Travas Strike'),
  para('Travas eletromagnéticas são cargas indutivas. Ao desligar, a bobina gera um pico de tensão reverso (flyback/kickback) que pode destruir transistores, queimar contatos de relé e injetar ruído na fonte 12V, afetando toda a eletrônica.'),
  spacer(80),
  callout('danger', 'CRÍTICO — Diodo Flyback Obrigatório em Cada Trava', [
    'Instale um diodo 1N4007 diretamente NA PORTA, em paralelo com cada fechadura Strike, NÃO no painel C.',
    'Polarização: Cátodo (faixa prateada) no fio de +12V. Anodo no fio de GND da trava.',
    'O diodo deve ficar o mais próximo possível da bobina — quanto menor o loop, mais eficaz a proteção.',
    'Sem este diodo: vida útil do relé cai drasticamente e a fonte 12V injeta ruído em toda a placa.',
  ]),
  spacer(100),

  h3('Diagrama de Ligação do Flyback (por porta)'),
  spacer(60),
  codeBlock([
    '  Fonte 12V (+) ────────────┬──────────── Strike VCC (+)',
    '                            │',
    '                        MOSFET (Dreno)',
    '                            │',
    '  Fonte 12V (−) ────────────┼──────────── Strike GND (−)',
    '                            │',
    '                     1N4007 (inversamente polarizado)',
    '                     [Anodo]────────[Cátodo / Faixa]',
    '                        (−)             (+12V)',
    '',
    '  O diodo fica em PARALELO com a Strike, junto à porta (Ambiente B)',
  ]),
  spacer(140),

  h2('7.2. Pull-ups I2C (SDA e SCL)'),
  para('O barramento I2C requer resistores pull-up que mantenham as linhas em nível alto em repouso. Para chicotes longos (>1m), os pull-ups internos dos chips são insuficientes.'),
  spacer(80),
  bullet('Valor: 4.7kΩ para cada linha (SDA e SCL), individualmente.'),
  bullet('Ponto de instalação: Nos bornes SDA e SCL da Breakout Board do ESP32-S3.'),
  bullet('Referência: Puxar para 3.3V (não 5V — o ESP32-S3 é 3.3V tolerant nos pinos I2C).'),
  bullet('Função: Garante transições limpas de sinal mesmo com capacitância parasita do chicote longo.'),
  spacer(120),

  h2('7.3. Capacitores de Bypass (Decoupling)'),
  para('Capacitores cerâmicos de 100nF devem ser soldados o mais próximo possível dos pinos VCC e GND de cada chip I2C, eliminando spikes de corrente que geram EMI.'),
  spacer(80),
  pinTable(
    ['Chip', 'Capacitor', 'Posicionamento', 'Observação'],
    [
      ['PCF8574', '100nF cerâmico', 'Entre VCC e GND do chip', 'Junto ao módulo na fachada — Ambiente A'],
      ['INA219 P1', '100nF cerâmico', 'Entre VCC e GND do chip', 'No Painel C'],
      ['INA219 P2', '100nF cerâmico', 'Entre VCC e GND do chip', 'No Painel C'],
    ],
    [2000, 2000, 2800, 2560]
  ),
  spacer(120),

  h2('7.4. Boas Práticas de Cabeamento'),
  spacer(80),
  bullet('Use cabo Cat5e FTP (blindado): a malha reduz interferência em chicotes de até 10 metros.'),
  bullet('Conecte a blindagem em apenas uma extremidade (lado C) para evitar laço de terra.'),
  bullet('Separe fisicamente cabos de potência (12V travas) de cabos de sinal (I2C, UART).'),
  bullet('Nunca paralele HDMI com cabos de sinal — o cabo micro-HDMI gera EMI significativa.'),
  bullet('Use fio AWG 22 (cabinho) para jumpers internos. AWG 18 ou superior para a fiação 12V das travas.'),
  pageBreak()
);

// ---- SEÇÃO 8: CHECKLIST ----
children.push(
  h1('8. Checklist de Instalação — Passo a Passo'),
  para('Siga esta lista em ordem. Não pule etapas. Marque cada item antes de avançar.'),
  spacer(120),

  h2('8.1. Preparação (Antes de Qualquer Conexão)'),
  numbered('Leia integralmente as Seções 1 e 2 deste manual e reúna todos os componentes do BoM.'),
  numbered('Identifique e separe os pinos 33-37 do ESP32-S3. Jamais conecte nada a eles.'),
  numbered('Prepare os resistores pull-up 4.7kΩ x2 e os capacitores 100nF x3 antes de montar.'),
  numbered('Identifique os fios de cada cabo Cat5e antes de soldar no aviação.'),
  numbered('Verifique com multímetro a polaridade de saída de ambas as fontes Mean Well antes de ligar.'),
  spacer(120),

  h2('8.2. Montagem do Quadro C'),
  numbered('Fixe as fontes Mean Well no painel traseiro do quadro hermético.'),
  numbered('Monte a Breakout Board do ESP32-S3 no centro do quadro.'),
  numbered('Instale a Orange Pi Zero 3 e conecte o cabo de rede rígido ao RJ45 externo.'),
  numbered('Conecte o cabo USB CDC (GPIO 19/20) da Orange Pi à Breakout Board.'),
  numbered('Crie o Terra Comum: interligue GND da Fonte 5V ao GND da Fonte 12V em borne dedicado.'),
  numbered('Instale os dois módulos INA219 — solde a ponte A0 no INA219 da porta P2 agora.'),
  numbered('Instale os pull-ups 4.7kΩ nos bornes SDA (GPIO 21) e SCL (GPIO 38), puxando para 3.3V.'),
  numbered('Solde os capacitores 100nF nos módulos INA219 (VCC para GND).'),
  numbered('Monte o cooler 40mm na lateral inferior com o filtro de poeira voltado para fora.'),
  numbered('Ligue o cooler ao Módulo MOSFET (GPIO 47).'),
  spacer(120),

  h2('8.3. Criação dos Chicotes Aeronáuticos'),
  numbered('Chicote 1 (LD2410B): Solde no conector 6 pinos. Teste continuidade.'),
  numbered('Chicote 2 (HX711): Solde no conector. Conecte as células de carga ao HX711 na base da balança primeiro.'),
  numbered('Solde os capacitores 100nF no módulo PCF8574 antes de fechá-lo na caixa da fachada.'),
  numbered('Chicotes 3 e 4 (Strikes + Reeds): Instale os Diodos 1N4007 em cada porta — NÃO no painel.'),
  numbered('Chicote 5 (Portão): Solde no relé seco e configure o NO/COM para bater na central Garen.'),
  spacer(120),

  h2('8.4. Montagem do Conector Aviação GX16 e Ambiente A'),
  numbered('Passe a tubulação da fachada ao quadro. Cabos micro-HDMI em tubulação separada.'),
  numbered('Termine o lado fêmea (fachada) do GX16 com todos os 14 pinos ativos.'),
  numbered('Instale o GM861S, PCF8574+Teclado, Botão Metálico e Buzzer na fachada.'),
  numbered('Termine o lado macho (painel C) do GX16 espelhando o mapeamento da Seção 4.'),
  numbered('Teste continuidade de todos os 14 pinos com multímetro antes de encaixar o conector.'),
  spacer(120),

  h2('8.5. Primeiro Flash e Verificação'),
  numbered('DESCONECTE o GM861S (GPIO 43/44) antes de ligar o ESP32 pela primeira vez.'),
  numbered('Conecte o ESP32 ao computador via USB e faça o upload do firmware via PlatformIO.'),
  numbered('Após flash concluído, reconecte o GM861S.'),
  numbered('Energize o quadro C. Verifique LEDs de status das fontes Mean Well.'),
  numbered('Monitore o Serial Monitor — confirme que ambos os cores do FreeRTOS iniciaram.'),
  numbered('Acione cada GPIO manualmente via Monitor Serial e verifique resposta de cada periférico.'),
  numbered('Teste as travas: acione relé, confirme pico de corrente no INA219 correspondente.'),
  numbered('Teste o teclado: pressione cada tecla e confirme recepção do INT no GPIO 6.'),
  numbered('Teste o QR: apresente um código e confirme string UART no GPIO 44.'),
  numbered('Confirme que a Orange Pi aparece no Serial USB CDC e troca pacotes com o ESP32.'),
  spacer(160),
  callout('success', 'Instalação Concluída com Sucesso', [
    'Se todos os itens acima foram verificados, o hardware da Portaria RLight v7 está operacional.',
    'Prossiga com a configuração do software na Orange Pi (FastAPI + SPA Web) conforme o README do repositório.',
    'Para suporte técnico, acesse rlight.com.br ou abra uma issue no repositório oficial.',
  ])
);

// =====================================================================
// BUILD DOCUMENT
// =====================================================================

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }, {
          level: 1, format: LevelFormat.BULLET, text: '◦',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } }
        }]
      },
      {
        reference: 'numbers',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 20 } }
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: C.primary },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 }
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: C.accent },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 }
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: C.primary },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.accent, space: 4 } },
            spacing: { before: 0, after: 160 },
            children: [
              new TextRun({ text: 'RLight Portaria Autônoma v7  ', font: 'Arial', size: 18, bold: true, color: C.primary }),
              new TextRun({ text: '|  Manual de Instalação de Hardware', font: 'Arial', size: 18, color: C.darkGray }),
            ]
          })
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.accent, space: 4 } },
            spacing: { before: 120, after: 0 },
            tabStops: [
              { type: TabStopType.CENTER, position: 4680 },
              { type: TabStopType.RIGHT, position: 9360 }
            ],
            children: [
              new TextRun({ text: 'rlight.com.br', font: 'Arial', size: 16, color: C.darkGray }),
              new TextRun({ text: '\t', font: 'Arial', size: 16 }),
              new TextRun({ text: 'Documento Normativo de Engenharia — Maio 2026', font: 'Arial', size: 16, color: C.darkGray }),
              new TextRun({ text: '\t', font: 'Arial', size: 16 }),
              new TextRun({ text: 'Página ', font: 'Arial', size: 16, color: C.darkGray }),
              new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: C.primary }),
            ]
          })
        ]
      })
    },
    children
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/Users/willian/Projetos/portaria.rlight/RLight_Manual_Instalacao_Hardware_v7.docx', buf);
  console.log('Documento gerado com sucesso em /Users/willian/Projetos/portaria.rlight/RLight_Manual_Instalacao_Hardware_v7.docx');
}).catch(console.error);
