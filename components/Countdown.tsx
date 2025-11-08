import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface CountdownProps {
  duration: number; // Saniye cinsinden
  onComplete: () => void;
  message?: string;
}

export const Countdown: React.FC<CountdownProps> = ({ duration, onComplete, message }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const [count, setCount] = React.useState(duration);

  useEffect(() => {
    // İlk animasyon
    scaleAnim.setValue(0);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Her saniye için animasyon
    const interval = setInterval(() => {
      setCount((prev) => {
        const newCount = prev - 1;
        
        if (newCount <= 0) {
          clearInterval(interval);
          // Animasyon ile kaybol
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onComplete();
          });
          return 0;
        }
        
        // Her sayı değişiminde animasyon
        scaleAnim.setValue(0);
        Animated.sequence([
          Animated.spring(scaleAnim, {
            toValue: 1.2,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();
        
        return newCount;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {message && <Text style={styles.message}>{message}</Text>}
        <Text style={styles.count}>{count}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Daha açık, arka plan görünsün
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  count: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#4CAF50',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
});

