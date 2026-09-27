################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
C_SRCS += \
../CMSIS/DSP/Source/ComplexMathFunctions/ComplexMathFunctions.c \
../CMSIS/DSP/Source/ComplexMathFunctions/ComplexMathFunctionsF16.c 

C_DEPS += \
./CMSIS/DSP/Source/ComplexMathFunctions/ComplexMathFunctions.d \
./CMSIS/DSP/Source/ComplexMathFunctions/ComplexMathFunctionsF16.d 

OBJS += \
./CMSIS/DSP/Source/ComplexMathFunctions/ComplexMathFunctions.o \
./CMSIS/DSP/Source/ComplexMathFunctions/ComplexMathFunctionsF16.o 


# Each subdirectory must supply rules for building sources it contributes
CMSIS/DSP/Source/ComplexMathFunctions/%.o: ../CMSIS/DSP/Source/ComplexMathFunctions/%.c CMSIS/DSP/Source/ComplexMathFunctions/subdir.mk
	@echo 'Building file: $<'
	@echo 'Invoking: MCU C Compiler'
	arm-none-eabi-gcc -std=gnu99 -D__REDLIB__ -DCPU_MCXN236VDF -DCPU_MCXN236VDF_cm33 -DMCUXPRESSO_SDK -DSDK_DEBUGCONSOLE=1 -DMCUX_META_BUILD -DMCXN236_SERIES -DSDK_I2C_BASED_COMPONENT_USED=1 -DCODEC_MULTI_ADAPTERS=1 -DCODEC_DA7212_ENABLE -DCR_INTEGER_PRINTF -DPRINTF_FLOAT_ENABLE=0 -D__MCUXPRESSO -D__USE_CMSIS -DDEBUG -DSDK_OS_BAREMETAL -DDISABLEFLOAT16 -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\drivers" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\inc" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\source\src" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\CMSIS" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\CMSIS\m-profile" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\device" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\device\periph1" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\utilities" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\utilities\str" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\utilities\debug_console_lite" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\codec" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\codec\port" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\codec\port\da7212" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\component\i2c" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\component\uart" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\CMSIS\DSP\Include" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\CMSIS\DSP\PrivateInclude" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\CMSIS\DSP\Source\DistanceFunctions" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\source" -I"C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\board" -O3 -fno-common -g3 -gdwarf-4 -mcpu=cortex-m33 -c -ffunction-sections -fdata-sections -fno-builtin -imacros "C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\source\mcux_config.h" -imacros "C:\Users\Dell\Documents\MCUXpressoIDE_25.6.136\workspace\SIH_ANC\SIH_test_1_sai_edma_record_playback\source\mcuxsdk_version.h" -fmacro-prefix-map="$(<D)/"= -mcpu=cortex-m33 -mfpu=fpv5-sp-d16 -mfloat-abi=hard -mthumb -D__REDLIB__ -fstack-usage -specs=redlib.specs -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.o)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


clean: clean-CMSIS-2f-DSP-2f-Source-2f-ComplexMathFunctions

clean-CMSIS-2f-DSP-2f-Source-2f-ComplexMathFunctions:
	-$(RM) ./CMSIS/DSP/Source/ComplexMathFunctions/ComplexMathFunctions.d ./CMSIS/DSP/Source/ComplexMathFunctions/ComplexMathFunctions.o ./CMSIS/DSP/Source/ComplexMathFunctions/ComplexMathFunctionsF16.d ./CMSIS/DSP/Source/ComplexMathFunctions/ComplexMathFunctionsF16.o

.PHONY: clean-CMSIS-2f-DSP-2f-Source-2f-ComplexMathFunctions

