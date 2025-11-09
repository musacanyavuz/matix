import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
}

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const steps: OnboardingStep[] = [
    {
      title: t('onboarding.step1.title'),
      description: t('onboarding.step1.description'),
      icon: '🎮',
    },
    {
      title: t('onboarding.step2.title'),
      description: t('onboarding.step2.description'),
      icon: '🏠',
    },
    {
      title: t('onboarding.step3.title'),
      description: t('onboarding.step3.description'),
      icon: '⚡',
    },
    {
      title: t('onboarding.step4.title'),
      description: t('onboarding.step4.description'),
      icon: '🏆',
    },
  ];

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentStep(currentStep + 1);
      });
    } else {
      // Son adımda onboarding'i tamamla
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      (navigation as any).navigate('Welcome');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    (navigation as any).navigate('Welcome');
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentStep(currentStep - 1);
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
          scrollEnabled={true}
        >
          {steps.map((step, index) => (
            <Animated.View
              key={index}
              style={[
                styles.stepContainer,
                { opacity: fadeAnim },
                { display: index === currentStep ? 'flex' : 'none' },
              ]}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{step.icon}</Text>
              </View>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.description}>{step.description}</Text>
            </Animated.View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.indicatorContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentStep && styles.indicatorActive,
                ]}
              />
            ))}
          </View>

          <View style={styles.buttonContainer}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handlePrevious}
              >
                <Text style={styles.buttonSecondaryText}>
                  {t('onboarding.previous')}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonPrimary,
                currentStep === 0 && styles.buttonFullWidth,
              ]}
              onPress={handleNext}
            >
              <Text style={styles.buttonPrimaryText}>
                {currentStep === steps.length - 1
                  ? t('onboarding.start')
                  : t('onboarding.next')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    color: '#666',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 20,
    paddingTop: 40, // Üstten boşluk
    paddingBottom: 40, // Alttan boşluk
  },
  stepContainer: {
    width: width - 60,
    maxWidth: 400, // Maksimum genişlik
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    minHeight: height * 0.6, // Minimum yükseklik (scroll için)
  },
  iconContainer: {
    width: Math.min(120, width * 0.25), // Responsive icon boyutu
    height: Math.min(120, width * 0.25),
    borderRadius: Math.min(60, width * 0.125),
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Math.min(30, height * 0.04), // Responsive margin
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  icon: {
    fontSize: Math.min(60, width * 0.15), // Responsive icon font size
  },
  title: {
    fontSize: Math.min(28, width * 0.07), // Responsive title font size
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: Math.min(20, height * 0.025), // Responsive margin
    paddingHorizontal: 10,
  },
  description: {
    fontSize: Math.min(16, width * 0.04), // Responsive description font size
    color: '#666',
    textAlign: 'center',
    lineHeight: Math.min(24, width * 0.06), // Responsive line height
    paddingHorizontal: 10,
  },
  footer: {
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: Math.max(20, height * 0.03), // Responsive bottom padding
    backgroundColor: '#F5F5F5',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Math.min(30, height * 0.04), // Responsive margin
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DDD',
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: '#4CAF50',
    width: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  button: {
    flex: 1,
    paddingVertical: Math.min(15, height * 0.02), // Responsive padding
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50, // Minimum buton yüksekliği
  },
  buttonFullWidth: {
    flex: 1,
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
  },
  buttonSecondary: {
    backgroundColor: '#E0E0E0',
  },
  buttonPrimaryText: {
    color: '#FFF',
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    fontWeight: 'bold',
  },
  buttonSecondaryText: {
    color: '#666',
    fontSize: Math.min(16, width * 0.04), // Responsive font size
    fontWeight: 'bold',
  },
});

