#include <math.h>
#include "arm_math.h"

#define BLOCK_SIZE 128

float32_t current_gain = 1.0f;
const float32_t target_level = 0.8f;
const float32_t agc_alpha = 0.01f;

void AGC_Process(float32_t* clean_signal, float32_t* out_buffer)
{
    for (uint16_t i = 0; i < BLOCK_SIZE; i++) {
        float32_t sample = clean_signal[i];
        float32_t abs_sample = fabsf(sample);
        float32_t error = target_level - abs_sample;

        current_gain += error * agc_alpha;

        if (current_gain > 8.0f)
            current_gain = 8.0f;

        if (current_gain < 0.1f)
            current_gain = 0.1f;

        out_buffer[i] = sample * current_gain;
    }

    arm_clip_f32(
        out_buffer,
        out_buffer,
        -0.99f,
        0.99f,
        BLOCK_SIZE
    );
}