import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

export function Field({label, value}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  );
}

export function Button({title, onPress, tone = 'default'}) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        tone === 'primary' && styles.buttonPrimary,
        pressed && styles.buttonPressed,
      ]}>
      <Text style={[styles.buttonText, tone === 'primary' && styles.buttonTextPrimary]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Section({title, children}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1f6feb',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111114',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b6b74',
    letterSpacing: 0.4,
  },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#6b6b74',
  },
  fieldValue: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111114',
    textAlign: 'right',
  },
  button: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d0d0d8',
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#1f6feb',
    borderColor: '#1f6feb',
  },
  buttonPressed: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111114',
  },
  buttonTextPrimary: {
    color: '#ffffff',
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6b6b74',
  },
});
