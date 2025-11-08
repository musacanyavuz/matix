import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface AnswerButtonProps {
  answer: number;
  onPress: () => void;
  disabled?: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
}

export const AnswerButton: React.FC<AnswerButtonProps> = ({
  answer,
  onPress,
  disabled = false,
  isCorrect = false,
  isWrong = false,
}) => {
  const getButtonStyle = () => {
    if (isCorrect) return styles.correctButton;
    if (isWrong) return styles.wrongButton;
    return styles.normalButton;
  };

  const getTextStyle = () => {
    if (isCorrect || isWrong) return styles.selectedText;
    return styles.normalText;
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle(), disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, getTextStyle()]}>{answer}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 15,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#4CAF50',
    minHeight: 60,
  },
  normalButton: {
    backgroundColor: '#fff',
    borderColor: '#4CAF50',
  },
  correctButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  wrongButton: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
  },
  disabledButton: {
    opacity: 0.5,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  normalText: {
    color: '#333',
  },
  selectedText: {
    color: '#fff',
  },
});

