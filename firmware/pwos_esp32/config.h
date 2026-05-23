/*
 * P-WOS ESP32 LIVE Configuration
 * This file contains all the unique settings for your specific device.
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// CONNECTION MODE
// ============================================================================
// Force WiFi mode since the hardware requires the hotspot
#define WIFI_ENABLED  true

// ============================================================================
// WiFi Credentials
// ============================================================================
#define WIFI_SSID     "esp32"
#define WIFI_PASS     "12345678"

// ============================================================================
// Local Mosquitto MQTT Broker
// ============================================================================
#define MQTT_BROKER   "192.168.137.1"
#define MQTT_PORT     1883
#define MQTT_USER     ""
#define MQTT_PASS     ""

// ============================================================================
// Device Identity
// ============================================================================
#define DEVICE_ID     "ESP32_PWOS_001"

// ============================================================================
// Pin Assignments (Matches Final Phase 11 & 12 Breadboard Build)
// ============================================================================
#define SOIL_PIN      34    // Custom Soil Sensor Mapping
#define DHT_PIN       14    // DHT11 Sensor
#define RELAY_PIN     27    // 5V Relay Switch
#define LED_PIN       2     // Onboard Board LED

// ============================================================================
// Custom Tuned Soil Sensor Calibration Bounds
// ============================================================================
#define SOIL_DRY      0
#define SOIL_WET      1840

// ============================================================================
// Sampling Interval
// ============================================================================
// Set to rapidly push every 5 seconds for dashboard testing
#define SAMPLE_INTERVAL  5000

#endif // CONFIG_H
