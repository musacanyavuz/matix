import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AgeGroup, AGE_GROUPS, AgeGroupOption } from '../constants/ageGroups';

interface AgeGroupSelectorProps {
  selectedAgeGroup: AgeGroup | null;
  onSelect: (ageGroup: AgeGroup) => void;
}

export const AgeGroupSelector: React.FC<AgeGroupSelectorProps> = ({
  selectedAgeGroup,
  onSelect,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Yaş / Sınıf Seç</Text>
      <View style={styles.grid}>
        {AGE_GROUPS.map((group) => (
          <TouchableOpacity
            key={group.id}
            style={[
              styles.ageButton,
              selectedAgeGroup === group.id && styles.ageButtonSelected,
            ]}
            onPress={() => onSelect(group.id)}
          >
            <Text
              style={[
                styles.ageButtonText,
                selectedAgeGroup === group.id && styles.ageButtonTextSelected,
              ]}
            >
              {group.label}
            </Text>
            <Text
              style={[
                styles.ageButtonDescription,
                selectedAgeGroup === group.id && styles.ageButtonDescriptionSelected,
              ]}
            >
              {group.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  ageButton: {
    width: '45%',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 70,
  },
  ageButtonSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
    transform: [{ scale: 1.05 }],
  },
  ageButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ageButtonTextSelected: {
    color: '#4CAF50',
  },
  ageButtonDescription: {
    fontSize: 12,
    color: '#666',
  },
  ageButtonDescriptionSelected: {
    color: '#4CAF50',
  },
});

