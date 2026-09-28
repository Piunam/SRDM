/*
 * Copyright (c) 2015, Freescale Semiconductor, Inc.
 * Copyright 2016-2020 NXP
 * All rights reserved.
 */

#include <stdio.h>
#include "app.h"
#include "board.h"
#include "fsl_debug_console.h"
#include "fsl_sai_edma.h"
#include "fsl_codec_common.h"
#include "rnnoise.h" /* Inserted RNNoise header */

/*******************************************************************************
 * Definitions
 ******************************************************************************/
/* RNNoise strictly demands 480 frames (10ms of audio at 48kHz) */
#define FRAME_SIZE    (480U)

/* 480 frames * 2 channels (Stereo) * 2 bytes (16-bit) = 1920 Bytes per block */
#define BUFFER_SIZE   (FRAME_SIZE * 2U * 2U)
#define BUFFER_NUMBER (4U)

/*******************************************************************************
 * Variables
 ******************************************************************************/
/* We MUST split Rx and Tx buffers. The AI takes time to process. If they share
   a buffer, the DMA will overwrite the audio before the AI is finished reading it. */
AT_NONCACHEABLE_SECTION_ALIGN(static uint8_t RxBuffer[BUFFER_NUMBER * BUFFER_SIZE], 4);
AT_NONCACHEABLE_SECTION_ALIGN(static uint8_t TxBuffer[BUFFER_NUMBER * BUFFER_SIZE], 4);

/* AI Conversion Buffers */
static float rnnoise_in[FRAME_SIZE];
static float rnnoise_out[FRAME_SIZE];

#if defined(DEMO_QUICKACCESS_SECTION_CACHEABLE) && DEMO_QUICKACCESS_SECTION_CACHEABLE
AT_NONCACHEABLE_SECTION_INIT(sai_edma_handle_t txHandle);
AT_NONCACHEABLE_SECTION_INIT(sai_edma_handle_t rxHandle);
#else
AT_QUICKACCESS_SECTION_DATA(sai_edma_handle_t txHandle);
AT_QUICKACCESS_SECTION_DATA(sai_edma_handle_t rxHandle);
#endif

/* Track completed DMA transfers */
volatile uint32_t rx_completed = 0U;
uint32_t process_index = 0U;

edma_handle_t dmaTxHandle = {0}, dmaRxHandle = {0};
extern codec_config_t boardCodecConfig;
codec_handle_t codecHandle;

#if (defined(DEMO_EDMA_HAS_CHANNEL_CONFIG) && DEMO_EDMA_HAS_CHANNEL_CONFIG)
extern edma_config_t dmaConfig;
#else
edma_config_t dmaConfig = {0};
#endif

/*******************************************************************************
 * Callbacks
 ******************************************************************************/
static void rx_callback(I2S_Type *base, sai_edma_handle_t *handle, status_t status, void *userData)
{
    if (kStatus_SAI_RxError == status) {
        PRINTF("RxErr ");
    } else {
        rx_completed++; /* Signal the main loop that a fresh block of audio is ready */
    }
}

static void tx_callback(I2S_Type *base, sai_edma_handle_t *handle, status_t status, void *userData)
{
    if (kStatus_SAI_TxError == status) {
        PRINTF("TxErr ");
    }
}

/*******************************************************************************
 * Main Code
 ******************************************************************************/
int main(void)
{
    sai_transfer_t xfer;
    sai_transceiver_t saiConfig;

    BOARD_InitHardware();
    BOARD_InitDebugConsole();
    PRINTF("Initializing Edge AI Audio Pipeline...\r\n");


    DenoiseState *st = rnnoise_create(NULL);
    if (st == NULL) {
        PRINTF("FATAL ERROR: RNNoise initialization failed. Check Linker/Flash.\r\n");
        while(1);
    }
    PRINTF("RNNoise Initialized!\r\n");

    /* 2. Init DMA and SAI Hardware */
#if (!defined(DEMO_EDMA_HAS_CHANNEL_CONFIG) || (defined(DEMO_EDMA_HAS_CHANNEL_CONFIG) && !DEMO_EDMA_HAS_CHANNEL_CONFIG))
    EDMA_GetDefaultConfig(&dmaConfig);
#endif
    EDMA_Init(DEMO_DMA, &dmaConfig);
    EDMA_CreateHandle(&dmaTxHandle, DEMO_DMA, DEMO_TX_EDMA_CHANNEL);
    EDMA_CreateHandle(&dmaRxHandle, DEMO_DMA, DEMO_RX_EDMA_CHANNEL);

#if defined(FSL_FEATURE_EDMA_HAS_CHANNEL_MUX) && FSL_FEATURE_EDMA_HAS_CHANNEL_MUX
#if defined(DEMO_SAI_TX_EDMA_CHANNEL)
    EDMA_SetChannelMux(DEMO_DMA, DEMO_TX_EDMA_CHANNEL, DEMO_SAI_TX_EDMA_CHANNEL);
#endif
#if defined(DEMO_SAI_RX_EDMA_CHANNEL)
    EDMA_SetChannelMux(DEMO_DMA, DEMO_RX_EDMA_CHANNEL, DEMO_SAI_RX_EDMA_CHANNEL);
#endif
#endif

    SAI_Init(DEMO_SAI);
    SAI_TransferTxCreateHandleEDMA(DEMO_SAI, &txHandle, tx_callback, NULL, &dmaTxHandle);
    SAI_TransferRxCreateHandleEDMA(DEMO_SAI, &rxHandle, rx_callback, NULL, &dmaRxHandle);

    SAI_GetClassicI2SConfig(&saiConfig, DEMO_AUDIO_BIT_WIDTH, kSAI_Stereo, 1U << DEMO_SAI_CHANNEL);
    saiConfig.syncMode              = DEMO_SAI_TX_SYNC_MODE;
    saiConfig.bitClock.bclkPolarity = DEMO_SAI_TX_BIT_CLOCK_POLARITY;
    saiConfig.masterSlave           = kSAI_Master;
    SAI_TransferTxSetConfigEDMA(DEMO_SAI, &txHandle, &saiConfig);

    saiConfig.syncMode = DEMO_SAI_RX_SYNC_MODE;
    SAI_TransferRxSetConfigEDMA(DEMO_SAI, &rxHandle, &saiConfig);

    SAI_TxSetBitClockRate(DEMO_SAI, DEMO_AUDIO_MASTER_CLOCK, DEMO_AUDIO_SAMPLE_RATE, DEMO_AUDIO_BIT_WIDTH, DEMO_AUDIO_DATA_CHANNEL);
    SAI_RxSetBitClockRate(DEMO_SAI, DEMO_AUDIO_MASTER_CLOCK, DEMO_AUDIO_SAMPLE_RATE, DEMO_AUDIO_BIT_WIDTH, DEMO_AUDIO_DATA_CHANNEL);

    BOARD_MASTER_CLOCK_CONFIG();

    for (int i = 0; i < BUFFER_NUMBER; i++) {
        xfer.data = RxBuffer + (i * BUFFER_SIZE);
        xfer.dataSize = BUFFER_SIZE;
        SAI_TransferReceiveEDMA(DEMO_SAI, &rxHandle, &xfer);
    }

    PRINTF("Audio Pipeline Running. Speak into the mic...\r\n");

    while (1)
    {
        if (rx_completed > process_index)
        {
            uint32_t idx = process_index % BUFFER_NUMBER;

            /* Cast the byte buffers into 16-bit integer pointers for audio math */
            int16_t *rx_ptr = (int16_t *)(RxBuffer + (idx * BUFFER_SIZE));
            int16_t *tx_ptr = (int16_t *)(TxBuffer + (idx * BUFFER_SIZE));

            /* --- PRE-PROCESSING --- */
            /* I2S is Stereo. We extract just the Left channel (i * 2) and cast it to float */
            for(int i = 0; i < FRAME_SIZE; i++) {
                rnnoise_in[i] = (float)rx_ptr[i * 2];
            }

            /* --- NEURAL NETWORK --- */
            rnnoise_process_frame(st, rnnoise_out, rnnoise_in);

            /* --- POST-PROCESSING --- */
            /* Cast the cleaned floats back to int16 and pack them into the Tx Buffer */
            for(int i = 0; i < FRAME_SIZE; i++) {
                int16_t clean_sample = (int16_t)rnnoise_out[i];
                tx_ptr[i * 2]     = clean_sample; /* Left Channel */
                tx_ptr[i * 2 + 1] = clean_sample; /* Right Channel (Duplicate left to right) */
            }

            /* --- HARDWARE TRIGGER --- */
            /* Queue the cleaned block to be pushed to the speaker */
            xfer.data = (uint8_t *)tx_ptr;
            xfer.dataSize = BUFFER_SIZE;
            SAI_TransferSendEDMA(DEMO_SAI, &txHandle, &xfer);

            /* Re-queue the Rx block so the microphone can write into it again next round */
            xfer.data = (uint8_t *)rx_ptr;
            xfer.dataSize = BUFFER_SIZE;
            SAI_TransferReceiveEDMA(DEMO_SAI, &rxHandle, &xfer);

            process_index++;
        }
    }
}
