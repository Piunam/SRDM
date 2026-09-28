#include "arm_math.h"

#define BLOCK_SIZE 128
#define NUM_STAGES 2
#define NLMS_TAPS 64
#define MU_STEP 0.1f

float32_t biquad_state[4 * NUM_STAGES];

float32_t biquad_coeffs[5 * NUM_STAGES] = {
    1.0f, -1.0f, 0.0f, 0.995f, 0.0f,
    0.98f, -1.96f, 0.98f, 1.95f, -0.96f
};

arm_biquad_casd_df1_inst_f32 hpf_inst;

float32_t nlms_state[NLMS_TAPS + BLOCK_SIZE - 1];
float32_t nlms_coeffs[NLMS_TAPS];
arm_lms_norm_inst_f32 nlms_inst;

float32_t current_gain = 1.0f;
const float32_t target_level = 0.8f;
const float32_t agc_alpha = 0.01f;

void AudioPipeline_Init(void)
{
    arm_biquad_cascade_df1_init_f32(
        &hpf_inst,
        NUM_STAGES,
        biquad_coeffs,
        biquad_state
    );

    arm_lms_norm_init_f32(
        &nlms_inst,
        NLMS_TAPS,
        nlms_coeffs,
        nlms_state,
        MU_STEP,
        BLOCK_SIZE
    );
}

void AudioPipeline_Process(
    float32_t* main_mic,
    float32_t* ref_mic,
    float32_t* out_buffer
)
{
    float32_t clean_signal[BLOCK_SIZE];
    float32_t nlms_output[BLOCK_SIZE];
    float32_t signal_power;
    float32_t noise_power;

    arm_biquad_cascade_df1_f32(
        &hpf_inst,
        main_mic,
        clean_signal,
        BLOCK_SIZE
    );

    arm_lms_norm_f32(
        &nlms_inst,
        ref_mic,
        clean_signal,
        nlms_output,
        clean_signal,
        BLOCK_SIZE
    );

    arm_power_f32(
        clean_signal,
        BLOCK_SIZE,
        &signal_power
    );

    arm_power_f32(
        ref_mic,
        BLOCK_SIZE,
        &noise_power
    );

    if (signal_power > (3.162f * noise_power))
    {
        arm_copy_f32(
            nlms_output,
            out_buffer,
            BLOCK_SIZE
        );
    }
    else
    {
        RNNoise_ProcessBlock(
            nlms_output,
            out_buffer
        );
    }
}