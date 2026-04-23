# RLight - Histórico de Versões e Evolução

Este documento detalha a jornada do projeto RLight, desde os primeiros protótipos até a infraestrutura de portaria autônoma v8.

---

## [v8.0.0] - Portaria na Nuvem & Criptografia (Versão Atual)
**Data:** 23 de Abril, 2026
**Foco:** Segurança de ponta a ponta e Experiência Premium.
- **Segurança:** Implementação de assinaturas HMAC-SHA256 (JWT) no ESP32-S3 usando `mbedtls`.
- **Visão:** Transição para OpenCV no Host (Orange Pi) com snapshots em RAM (Zero-write).
- **Backend:** Servidor Node.js/Express na Oracle Cloud com NGINX e SSL.
- **UI/UX:** Design Glassmorphism Apple-style, suporte a temas Claro/Escuro (Adaptive) e imersão total para iPhone 16 Pro Max.

## [v7.0.0] - Migração I2C & Estabilidade
**Foco:** Refatoração de Hardware e FSM.
- **Hardware:** Substituição do protocolo Wiegand por Keypad Matriz 4x3 via Expansor I2C (PCF8574).
- **Firmware:** Máquina de Estados (FSM) não-bloqueante e otimização de memória.
- **UI:** Primeira versão da Web SPA com feedback em tempo real.

## [v6.0.0] - Teclado Matricial & FSM Core
**Foco:** Controle de Acesso por Senha.
- **Funcionalidade:** Driver inicial para teclado matricial e validação de senhas mestre/reversa.
- **Integração:** Início da coordenação Host <-> ESP32 via USB Bridge.

## [v5.0.0] - Notificações & Automação
**Foco:** Conectividade e Feedback Remoto.
- **Social:** Integração com Bot do Telegram para notificações de abertura e alertas.
- **Automação:** Expansão da integração Home Assistant com sensores de estado da trava.

## [v4.0.0] - Ecossistema MQTT
**Foco:** Padronização de Protocolos.
- **Comunicação:** Migração do controle direto para mensageria MQTT.
- **Dashboard:** Primeiros painéis no Home Assistant Lovelace.

## [v3.0.0] - Wiegand Legacy
**Foco:** Suporte a RFID.
- **Acesso:** Implementação de leitores RFID Wiegand 26/34 bits.
- **Segurança:** Banco de dados local de tags autorizadas no Host.

## [v2.0.0] - Local API & Web Control
**Foco:** Controle via Navegador.
- **API:** Criação de endpoints locais (Flask/Python) para acionamento remoto.
- **Interface:** HTML/CSS simples para "Abrir Portão" via celular na rede local.

## [v1.0.0] - Proof of Concept
**Foco:** Funcionamento Básico.
- **Hardware:** ESP32 acionando um relé simples (Strike).
- **Lógica:** Acionamento via botão físico e serial debug.

---

> **Filosofia do Projeto:** Evoluir da automação simples para uma solução de engenharia de segurança robusta, focada em privacidade, criptografia de borda e design centrado no usuário.
