import React from 'react';
import { View, Text } from 'react-native';
import { colors, radii, spacing, typography } from './theme';
import styles from '../styles/components/Card.style';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';

export default function Card({ title, subtitle, right, children, style, titleStyle, animateTitlePulse = false }) {
  return (
    <View style={[styles.card, style]}>
      {(title || right) && (
        <View style={styles.header}>
          {!!title && (
            animateTitlePulse ? (
              <Animated.Text
                entering={FadeInDown.springify().damping(16).mass(0.5).withInitialValues({ opacity: 0, transform: [{ translateY: -6 }, { scale: 0.98 }] })}
                layout={Layout.springify()}
                style={[styles.title, titleStyle]}
              >
                {title}
              </Animated.Text>
            ) : (
              <Text style={[styles.title, titleStyle]}>{title}</Text>
            )
          )}
          {!!right && <View>{right}</View>}
        </View>
      )}
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

// estilos movidos para styles/components/Card.styles.js
