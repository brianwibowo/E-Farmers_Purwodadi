import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  useWindowDimensions,
  Image,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';

const SLIDES = [
  {
    id: '1',
    image: require('../../assets/onboarding1.jpg'),
    title: 'Pencatatan Keuangan Mudah',
    description: 'Catat pengeluaran operasional tani Anda seperti benih, pupuk, dan sewa alat secara rapi.',
  },
  {
    id: '2',
    image: require('../../assets/onboarding2.jpg'),
    title: 'Kalkulator Hasil Panen',
    description: 'Estimasi pendapatan kotor dan laba bersih Anda dengan kalkulator panen terintegrasi.',
  },
  {
    id: '3',
    image: require('../../assets/onboarding3.jpg'),
    title: 'Analisis Margin Untung',
    description: 'Pantau grafik margin keuntungan dan ringkasan kas bulanan Anda secara visual dan interaktif.',
  },
];

export const OnboardingScreen = ({ route }) => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleFinishOnboarding = async () => {
    try {
      await AsyncStorage.setItem('HAS_SEEN_ONBOARDING', 'true');
      if (route.params?.onFinish) {
        route.params.onFinish();
      } else {
        navigation.replace('Login');
      }
    } catch (err) {
      console.error('Failed to save onboarding status', err);
      navigation.replace('Login');
    }
  };

  const handleNext = () => {
    const nextIndex = currentSlideIndex + 1;
    if (nextIndex < SLIDES.length) {
      flatListRef.current?.scrollToIndex({ index: nextIndex });
      setCurrentSlideIndex(nextIndex);
    }
  };

  const handleSkip = () => {
    handleFinishOnboarding();
  };

  const updateCurrentSlideIndex = (e) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / width);
    setCurrentSlideIndex(currentIndex);
  };

  const renderSlide = ({ item }) => {
    return (
      <View style={[styles.slideContainer, { width }]}>
        <View style={styles.imageWrapper}>
          <Image source={item.image} style={styles.image} resizeMode="cover" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Action Header */}
      <View style={styles.header}>
        {currentSlideIndex < SLIDES.length - 1 ? (
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Lewati</Text>
          </Pressable>
        ) : (
          <View style={styles.emptyHeaderPlaceholder} />
        )}
      </View>

      {/* Main FlatList Slider */}
      <FlatList
        ref={flatListRef}
        onMomentumScrollEnd={updateCurrentSlideIndex}
        pagingEnabled
        data={SLIDES}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        bounces={false}
      />

      {/* Footer (Dots + Actions) */}
      <View style={styles.footer}>
        {/* Indicator Dots */}
        <View style={styles.indicatorContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                currentSlideIndex === index && styles.activeIndicator,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          {currentSlideIndex === SLIDES.length - 1 ? (
            <Pressable onPress={handleFinishOnboarding} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Mulai Sekarang</Text>
            </Pressable>
          ) : (
            <Pressable onPress={handleNext} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Lanjut</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
  },
  emptyHeaderPlaceholder: {
    height: 36,
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  imageWrapper: {
    flex: 0.6,
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.colors.outlineVariant,
    marginBottom: 32,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 0.4,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 15,
    fontWeight: '400',
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  indicator: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.outlineVariant,
  },
  activeIndicator: {
    width: 24,
    backgroundColor: theme.colors.primary,
  },
  buttonContainer: {
    width: '100%',
  },
  actionBtn: {
    height: 52,
    width: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionBtnText: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
});

export default OnboardingScreen;
