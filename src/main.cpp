// src/main.cpp - RLIGHT V7 CORE ENGINE (RECONSTRUCTED)
#include <Arduino.h>
#include <esp_wifi.h>
#include <esp_bt.h>
#include <esp_task_wdt.h>

#include "config/Config.h"
#include "config/ConfigManager.h"
#include "health/HealthMonitor.h"
#include "middleware/SharedMemory.h"
#include "comms/UsbBridge.h"
#include "fsm/StateMachine.h"
#include "sensors/QRReader.h"
#include "sensors/KeypadHandler.h"
#include "sensors/Scale.h"
#include "sensors/MmWave.h"
#include "sensors/PowerMonitor.h"
#include "actuators/Strike.h"
#include "actuators/Led.h"
#include "actuators/Buzzer.h"

// Protótipos de Tasks
void sensorTask(void* pvParameters);
void logicTask(void* pvParameters);

void setup() {
    // 1. Hardware Básico
    Serial.begin(115200);
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
    
    // 2. RF Off (Silêncio total para estabilidade IRAM)
    esp_wifi_stop();
    esp_bt_controller_disable();
    
    Serial.println("\n--- RLIGHT_V7_BOOTING ---");

    // 3. Inicialização de Módulos (Singletons)
    ConfigManager::instance().init();
    HealthMonitor::instance().init();
    SharedMemory::instance().init();
    UsbBridge::instance().init();
    
    QRReader::instance().init();
    KeypadHandler::instance().init();
    Scale::instance().init();
    MmWave::instance().init();
    PowerMonitor::instance().init();
    
    Strike::P1().init();
    Strike::P2().init();
    Led::btn().init();
    Led::qr().init();
    Buzzer::init();

    // 4. Tasks Dual-Core
    xTaskCreatePinnedToCore(sensorTask, "SensorTask", 8192, NULL, 1, NULL, 0); // Core 0
    xTaskCreatePinnedToCore(logicTask,  "LogicTask",  8192, NULL, 2, NULL, 1); // Core 1

    Serial.println("{\"status\": \"READY\", \"engine\": \"V7_KEYPAD_ACTIVE\"}");
}

void sensorTask(void* pvParameters) {
    for(;;) {
        PhysicalState world = {};
        
        // 1. Poll Sensores
        QRReader::instance().poll();
        KeypadHandler::instance().poll();
        
        // 2. Coletar dados para Snapshot
        strlcpy(world.qr_code, QRReader::instance().getLastQR(), sizeof(world.qr_code));
        strlcpy(world.carrier, QRReader::instance().getLastCarrier(), sizeof(world.carrier));
        
        world.keypad_active = (KeypadHandler::instance().getBuffer()[0] != '\0');
        world.keypad_digits = strlen(KeypadHandler::instance().getBuffer());
        world.keypad_done   = KeypadHandler::instance().hasValue();
        
        // Validação de Senha integrada no polling de sensor para reatividade
        if (world.keypad_done) {
            AccessResult res = AccessController::instance().validatePassword(KeypadHandler::instance().getBuffer());
            if (res.type != AccessType::NONE) {
                world.access_granted = true;
                world.authorized_access = {res.type};
                strlcpy(world.authorized_access.label, res.label, sizeof(world.authorized_access.label));
            } else {
                world.access_granted = false;
            }
            KeypadHandler::instance().reset();
        }

        world.weight_g       = Scale::instance().getWeight();
        world.person_present = MmWave::instance().personPresent();
        world.p1_open        = (digitalRead(PIN_SW_P1) == LOW);
        world.p2_open        = (digitalRead(PIN_SW_P2) == LOW);
        world.ina_p1_ma      = PowerMonitor::instance().getCurrentP1();
        
        // 3. Update Shared Memory
        SharedMemory::instance().update(world);
        
        vTaskDelay(pdMS_TO_TICKS(20)); // 50Hz polling
    }
}

void logicTask(void* pvParameters) {
    for(;;) {
        // 1. Processar incoming HA/Host commands
        UsbBridge::instance().processIncoming();
        
        // 2. Tick da FSM
        PhysicalState world = SharedMemory::instance().getSnapshot();
        StateMachine::instance().tick(world);
        
        // 3. Health check periódico
        static uint32_t last_h = 0;
        if (millis() - last_h > HEALTH_REPORT_MS) {
            last_h = millis();
            UsbBridge::instance().sendHeartbeat(StateMachine::instance().ctx());
        }
        
        vTaskDelay(pdMS_TO_TICKS(10)); // 100Hz logic
    }
}

void loop() {
    // Nada aqui, usamos FreeRTOS tasks
    vTaskDelay(pdMS_TO_TICKS(1000));
}
