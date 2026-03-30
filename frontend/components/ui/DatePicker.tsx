import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent }
from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/Colors';

interface DatePickerProps {
  placeholder: string;
  value: Date | null;
  onSelect: (date: Date) => void;
  label?: string;
  error?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}

export function DatePicker({
  placeholder,
  value,
  onSelect,
  label,
  error,
  maximumDate,
  minimumDate,
}: DatePickerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(value || new Date());

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  // Web: usar input HTML5 nativo directamente
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View style={styles.webContainer}>
          <input
            type="date"
            value={formatDateForInput(value)}
            onChange={(e) => {
              if (e.target.value) {
                onSelect(new Date(e.target.value));
              }
            }}
            max={maximumDate ? formatDateForInput(maximumDate) : undefined}
            min={minimumDate ? formatDateForInput(minimumDate) : undefined}
            style={{
              width: '100%',
              height: 56,
              paddingHorizontal: 16,
              fontSize: 16,
              fontFamily: 'inherit',
              borderWidth: error ? 2 : 1.5,
              borderColor: error ? Colors.error : value ? Colors.primary : Colors.border,
              borderRadius: 16,
              backgroundColor: error ? Colors.errorLight : Colors.backgroundCard,
              color: Colors.text,
              cursor: 'pointer',
              outline: 'none',
            }}
          />
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-circle" size={12}
            color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    );
  }

  const handlePress = () => {
    if (value) {
      setTempDate(value);
    } else {
      setTempDate(new Date());
    }
    setIsVisible(true);
  };

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === 'android') {
        onSelect(selectedDate);
        setIsVisible(false);
      }
    }
  };

  const handleConfirm = () => {
    onSelect(tempDate);
    setIsVisible(false);
  };

  const handleCancel = () => {
    setIsVisible(false);
  };

  // Android: picker nativo
  if (Platform.OS === 'android') {
    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TouchableOpacity
          style={[
            styles.selectButton,
            error && styles.selectButtonError,
            value && styles.selectButtonFilled,
          ]}
          onPress={handlePress}
          activeOpacity={0.9}
        >
          <Text
            style={[
              styles.selectText,
              !value && styles.placeholderText,
            ]}
          >
            {value ? formatDate(value) : placeholder}
          </Text>
          <FontAwesome
            name="calendar"
            size={18}
            color={Colors.textLight}
            style={styles.icon}
          />
        </TouchableOpacity>

        {error && (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-circle" size={12} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {isVisible && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="default"
            onChange={handleChange}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
          />
        )}
      </View>
    );
  }

  // iOS con modal
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[
          styles.selectButton,
          error && styles.selectButtonError,
          value && styles.selectButtonFilled,
        ]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <Text
          style={[
            styles.selectText,
            !value && styles.placeholderText,
          ]}
        >
          {value ? formatDate(value) : placeholder}
        </Text>
        <FontAwesome
          name="calendar"
          size={18}
          color={Colors.textLight}
          style={styles.icon}
        />
      </TouchableOpacity>

      {error && (
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={12}
		color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={handleCancel}
	style={styles.closeButton}>
                <FontAwesome name="times" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                locale="es-ES"
                textColor={Colors.text}
              />
            </View>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </TouchableOpacity>
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
  webContainer: {
    width: '100%',
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
  icon: {
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
    paddingBottom: 30,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
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
  pickerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: Colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
  },
});
