import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps {
  placeholder: string;
  value: string;
  onSelect: (value: string) => void;
  options: SelectOption[];
  label?: string;
  error?: string;
}

export function Select({
  placeholder,
  value,
  onSelect,
  options,
  label,
  error,
}: SelectProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const selectedOption = options.find((opt) => opt.value === value);

  const handlePress = () => {
    setIsVisible(true);
  };

  const handleSelect = (selectedValue: string) => {
    onSelect(selectedValue);
    setIsVisible(false);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[
            styles.selectButton,
            error && styles.selectButtonError,
            value && styles.selectButtonFilled,
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <Text
            style={[
              styles.selectText,
              !value && styles.placeholderText,
            ]}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
          <FontAwesome
            name="chevron-right"
            size={16}
            color={Colors.textLight}
            style={styles.chevron}
          />
        </TouchableOpacity>
      </Animated.View>

      {error && (
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={12} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
              >
                <FontAwesome name="times" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsList}>
              {options.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    index === options.length - 1 && styles.optionItemLast,
                    value === option.value && styles.optionItemSelected,
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionLabel,
                        value === option.value && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {option.description && (
                      <Text style={styles.optionDescription}>
                        {option.description}
                      </Text>
                    )}
                  </View>
                  {value === option.value && (
                    <FontAwesome
                      name="check"
                      size={18}
                      color={Colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: Colors.backgroundCard,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectButtonFilled: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  selectButtonError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  selectText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  placeholderText: {
    color: Colors.placeholder,
  },
  chevron: {
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
    gap: 6,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: 8,
  },
  optionsList: {
    paddingHorizontal: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  optionItemLast: {
    borderBottomWidth: 0,
  },
  optionItemSelected: {
    backgroundColor: Colors.primaryMuted,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: Colors.primaryDark,
  },
  optionDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
