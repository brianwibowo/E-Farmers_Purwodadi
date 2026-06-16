import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  useWindowDimensions,
  SafeAreaView,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '../theme';

export const FeatureTour = ({ visible, steps, onFinish, onClose }) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [currentStep, setCurrentStep] = useState(0);
  const [layout, setLayout] = useState(null);

  const activeStep = steps[currentStep];

  useEffect(() => {
    if (visible && activeStep) {
      if (activeStep.onBeforeShow) {
        activeStep.onBeforeShow();
      }
      
      const delay = activeStep.onBeforeShow ? 350 : 150;
      // Small timeout to allow screen layouts to settle
      const timer = setTimeout(() => {
        if (activeStep.ref && activeStep.ref.current) {
          activeStep.ref.current.measure((x, y, width, height, pageX, pageY) => {
            // Check for valid measurement coordinates (sometimes 0 on first render/web)
            if (width > 0 && height > 0) {
              setLayout({ x: pageX, y: pageY, width, height });
            } else {
              setLayout(null);
            }
          });
        } else {
          setLayout(null);
        }
      }, delay);

      return () => clearTimeout(timer);
    } else {
      setLayout(null);
    }
  }, [currentStep, visible, activeStep]);

  // Reset to first step on opening
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
    }
  }, [visible]);

  if (!visible || !activeStep) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Determine popover position based on target height, available space, or custom override
  let popoverStyle = {};
  if (layout) {
    if (activeStep.popoverPosition === 'top') {
      popoverStyle = {
        top: 120,
        left: (screenWidth - 288) / 2, // Centered horizontally
      };
    } else if (activeStep.popoverPosition === 'bottom') {
      popoverStyle = {
        bottom: 150,
        left: (screenWidth - 288) / 2, // Centered horizontally
      };
    } else if (activeStep.popoverPosition === 'center') {
      popoverStyle = {
        top: screenHeight / 2 - 100,
        left: (screenWidth - 288) / 2,
      };
    } else {
      // Automatic positioning
      const spaceAbove = layout.y;
      const spaceBelow = screenHeight - (layout.y + layout.height);
      const placeAbove = spaceAbove > spaceBelow;

      if (placeAbove) {
        // Place above target
        popoverStyle = {
          bottom: Math.min(screenHeight - 80, screenHeight - layout.y + 12),
          left: Math.max(16, Math.min(screenWidth - 304, layout.x + (layout.width / 2) - 144)),
        };
      } else {
        // Place below target
        popoverStyle = {
          top: Math.min(screenHeight - 220, layout.y + layout.height + 12),
          left: Math.max(16, Math.min(screenWidth - 304, layout.x + (layout.width / 2) - 144)),
        };
      }
    }
  } else {
    // Center of screen fallback
    popoverStyle = {
      alignSelf: 'center',
      top: screenHeight / 2 - 100,
    };
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.overlay}>
        {/* Absolute Mask overlays around the highlighted area */}
        {layout && (
          <>
            {/* Top Mask */}
            <View style={[styles.mask, { top: 0, left: 0, right: 0, height: layout.y }]} />
            {/* Bottom Mask */}
            <View style={[styles.mask, { top: layout.y + layout.height, left: 0, right: 0, bottom: 0 }]} />
            {/* Left Mask */}
            <View style={[styles.mask, { top: layout.y, left: 0, width: layout.x, height: layout.height }]} />
            {/* Right Mask */}
            <View style={[styles.mask, { top: layout.y, left: layout.x + layout.width, right: 0, height: layout.height }]} />

            {/* Glowing Border around target */}
            <View style={[
              styles.highlightBorder,
              {
                top: layout.y - 4,
                left: layout.x - 4,
                width: layout.width + 8,
                height: layout.height + 8,
              }
            ]} />
          </>
        )}

        {/* Fallback full dim if layout measurement is invalid/web-only center */}
        {!layout && <View style={[styles.mask, StyleSheet.absoluteFill]} />}

        {/* Tooltip Popover */}
        <View style={[styles.popover, popoverStyle]}>
          {/* Header step progress */}
          <View style={styles.popoverHeader}>
            <Text style={styles.stepText}>Langkah {currentStep + 1} dari {steps.length}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={16} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {/* Body */}
          <Text style={styles.title}>{activeStep.title}</Text>
          <Text style={styles.description}>{activeStep.description}</Text>

          {/* Footer Actions */}
          <View style={styles.actions}>
            {currentStep > 0 ? (
              <Pressable onPress={handlePrev} style={styles.backButton}>
                <Text style={styles.backText}>Kembali</Text>
              </Pressable>
            ) : (
              <Pressable onPress={onClose} style={styles.backButton}>
                <Text style={styles.skipText}>Lewati</Text>
              </Pressable>
            )}

            <Pressable onPress={handleNext} style={styles.nextButton}>
              <Text style={styles.nextText}>
                {currentStep === steps.length - 1 ? 'Selesai' : 'Lanjut'}
              </Text>
              <MaterialIcons 
                name={currentStep === steps.length - 1 ? 'check' : 'navigate-next'} 
                size={18} 
                color={theme.colors.onPrimary} 
              />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  mask: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  highlightBorder: {
    position: 'absolute',
    borderRadius: theme.rounded.lg,
    borderWidth: 2.5,
    borderColor: '#cbffc2', // Lime green glowing border
    backgroundColor: 'transparent',
    shadowColor: '#cbffc2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  popover: {
    position: 'absolute',
    width: 288,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.rounded.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  popoverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.outline,
    textTransform: 'uppercase',
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 6,
  },
  description: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
  },
  skipText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.rounded.lg,
    gap: 4,
  },
  nextText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
});

export default FeatureTour;
