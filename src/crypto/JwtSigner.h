// src/crypto/JwtSigner.h
#pragma once
#include <stdint.h>
#include <stddef.h>

class JwtSigner {
public:
  static JwtSigner& instance() { static JwtSigner i; return i; }
  void sign(const char* token, const char* qr_code, const char* carrier, float weight, uint32_t ts, char* out_buf, size_t out_sz);
  void rotateSecret(const char* new_secret);
private:
  JwtSigner() = default;
  char _active_secret[64] = "rlight_v6_base_secret";
  char _prev_secret[64]   = "rlight_v6_base_secret_old";
};
