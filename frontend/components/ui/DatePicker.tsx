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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { AppColors } from '@/constants/Colors';
import { useAppTheme } from '@/contexts/ThemeContext';

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
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [isVisible, setIsVisible] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(value || new Date());

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
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
              padding: '0 16px',
              fontSize: 16,
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
              fontWeight: 500,
              borderWidth: error ? 2 : 1.5,
              borderStyle: 'solid',
              borderColor: error ? colors.error : value ? colors.primary : colors.border,
              borderRadius: 16,
              backgroundColor: error ? colors.errorLight : colors.backgroundCard,
              color: colors.text,
              cursor: 'pointer',
              outline: 'none',
            }}
          />
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-circle" size={12}
            color={colors.error} />
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
          accessibilityRole="button"
          accessibilityLabel={label ?? placeholder}
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
            color={colors.textLight}
            style={styles.icon}
          />
        </TouchableOpacity>

        {error && (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-circle" size={12} color={colors.error} />
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
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
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
          color={colors.textLight}
          style={styles.icon}
        />
      </TouchableOpacity>

      {error && (
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={12}
		color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity
                onPress={handleCancel}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Cerrar selector de fecha"
              >
                <FontAwesome name="times" size={20} color={colors.text} />
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
                textColor={colors.text}
              />
            </View>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel="Confirmar fecha"
            >
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.backgroundCard,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectButtonFilled: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  selectButtonError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  selectText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  placeholderText: {
    color: colors.placeholder,
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
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 24,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 380,
    shadowColor: colors.shadowDark,
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
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  pickerContainer: {
    paddingVertical: 8,
    alignItems: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  confirmButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
  },
});
