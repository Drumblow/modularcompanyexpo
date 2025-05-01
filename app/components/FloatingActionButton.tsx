import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type FloatingActionButtonProps = {
  onPress: () => void;
  icon: string;
  label?: string;
  backgroundColor?: string;
  color?: string;
  position?: 'bottomRight' | 'bottomLeft' | 'topRight' | 'topLeft';
  size?: number;
};

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon,
  label,
  backgroundColor = '#0284c7',
  color = 'white',
  position = 'bottomRight',
  size = 56,
}) => {
  const positionStyle = {
    bottomRight: { bottom: 20, right: 20 },
    bottomLeft: { bottom: 20, left: 20 },
    topRight: { top: 20, right: 20 },
    topLeft: { top: 20, left: 20 },
  };

  return (
    <View style={[styles.container, positionStyle[position]]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor, width: size, height: size, borderRadius: size / 2 },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Ionicons name={icon as any} size={size * 0.5} color={color} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 999,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  labelContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  label: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default FloatingActionButton; 