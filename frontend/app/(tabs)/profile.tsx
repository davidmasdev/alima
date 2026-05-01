import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { NumberInput } from '@/components/ui/NumberInput';
import { Colors } from '@/constants/Colors';
import { ApiError } from '@/services/api';
import { authService } from '@/services/auth';
import { dailyLogService } from '@/services/dailyLog';
import { profileService } from '@/services/profile';
import type { MealType } from '@/types/dailyLog';
import type { Profile } from '@/types/profile';

interface FormErrors {
  name?: string;
  gender?: string;
  birthDate?: string;
  activity?: string;
  goal?: string;
  weight?: string;
  height?: string;
  form?: string;
}

const genderOptions = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'other', label: 'Otro' },
  { value: 'prefer_not_to_say', label: 'Prefiero no decirlo' },
];

const activityOptions = [
  { value: 'sedentary', label: 'Sedentario', description: 'Poco o ningún ejercicio' },
  { value: 'light', label: 'Actividad ligera', description: 'Ejercicio 1-3 días por semana' },
  { value: 'moderate', label: 'Actividad moderada', description: 'Ejercicio 3-5 días por semana' },
  { value: 'active', label: 'Activo', description: 'Ejercicio 6-7 días por semana' },
  { value: 'very_active', label: 'Muy Activo', description: 'Ejercicio intenso diario o trabajo físico' },
];

const goalOptions = [
  { value: 'maintain', label: 'Mantener peso' },
  { value: 'lose', label: 'Perder peso' },
  { value: 'gain', label: 'Ganar peso' },
];

function getOptionLabel(
  options: { value: string; label: string }[],
  value: string | null,
): string {
  if (!value) return 'Pendiente';
  return options.find((option) => option.value === value)?.label ?? value;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isMealTypesModalVisible, setIsMealTypesModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingMealTypes, setIsSavingMealTypes] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mealTypes, setMealTypes] = useState<MealType[]>([]);
  const [mealTypeNames, setMealTypeNames] = useState(['', '', '']);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [activity, setActivity] = useState('');
  const [goal, setGoal] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const loadProfile = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [data, loadedMealTypes] = await Promise.all([
        profileService.getProfile(),
        dailyLogService.getMealTypes(),
      ]);
      setProfile(data);
      setMealTypes(loadedMealTypes);
    } catch {
      setLoadError('No se pudo cargar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const openEdit = () => {
    setName(profile?.nombre ?? '');
    setGender(profile?.sexo ?? '');
    setBirthDate(parseDate(profile?.fecha_nacimiento ?? null));
    setActivity(profile?.nivel_actividad ?? '');
    setGoal(profile?.objetivo ?? '');
    setWeight(profile?.peso ? String(profile.peso) : '');
    setHeight(profile?.altura ? String(profile.altura) : '');
    setErrors({});
    setIsEditModalVisible(true);
  };

  const openMealTypesEdit = () => {
    const names = mealTypes.map((mealType) => mealType.nombre);
    setMealTypeNames([names[0] ?? '', names[1] ?? '', names[2] ?? '']);
    setErrors({});
    setIsMealTypesModalVisible(true);
  };

  const closeMealTypesEdit = () => {
    setIsMealTypesModalVisible(false);
  };

  const handleSaveMealTypes = async () => {
    const names = mealTypeNames.map((item) => item.trim()).filter(Boolean);
    if (names.length === 0) {
      setErrors({ form: 'Añade al menos un tipo de comida' });
      return;
    }

    setIsSavingMealTypes(true);
    try {
      const updatedMealTypes = await dailyLogService.updateMealTypes(names);
      setMealTypes(updatedMealTypes);
      setIsMealTypesModalVisible(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({ form: error.detail });
      } else {
        setErrors({ form: 'No se pudieron guardar los tipos de comida' });
      }
    } finally {
      setIsSavingMealTypes(false);
    }
  };

  const closeEdit = () => {
    setIsEditModalVisible(false);
  };

  const validateEditForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (!gender) newErrors.gender = 'Selecciona tu género';
    if (!birthDate) newErrors.birthDate = 'Selecciona tu fecha de nacimiento';
    if (!activity) newErrors.activity = 'Selecciona tu nivel de actividad';
    if (!goal) newErrors.goal = 'Selecciona tu objetivo';
    if (!weight.trim() || isNaN(Number(weight)) || Number(weight) <= 0) {
      newErrors.weight = 'Ingresa un peso válido';
    }
    if (!height.trim() || isNaN(Number(height)) || Number(height) <= 0) {
      newErrors.height = 'Ingresa una altura válida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateEditForm() || !birthDate) return;

    setIsSaving(true);

    try {
      const updatedProfile = await profileService.saveProfile({
        nombre: name.trim(),
        fecha_nacimiento: formatDate(birthDate),
        sexo: gender,
        nivel_actividad: activity,
        objetivo: goal,
        peso: Number(weight),
        altura: Number(height),
      });
      setProfile(updatedProfile);
      setIsEditModalVisible(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({ form: error.detail });
      } else {
        setErrors({ form: 'No se pudo guardar el perfil' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await authService.clearSession();
    router.replace('/');
  };

  const handleDeleteAccount = () => {
    setIsDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);

    try {
      await profileService.deleteAccount();
      setIsDeleteModalVisible(false);
      router.replace('/');
    } catch {
      setIsDeleteModalVisible(false);
      setLoadError('No se pudo eliminar la cuenta');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalVisible(false);
  };

  const isProfileComplete = Boolean(
    profile?.nombre &&
    profile.fecha_nacimiento &&
    profile.sexo &&
    profile.nivel_actividad &&
    profile.objetivo &&
    profile.peso &&
    profile.altura,
  );

  const maxDate = new Date();
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.headerBackground} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <>
            {loadError && <Text style={styles.errorText}>{loadError}</Text>}

            {!isProfileComplete && (
              <View style={styles.incompleteBox}>
                <Text style={styles.incompleteText}>
                  Completa tu perfil para ver todos tus datos nutricionales.
                </Text>
              </View>
            )}

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nombre:</Text>
                <Text style={styles.infoValue}>{profile?.nombre ?? 'Pendiente'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Correo:</Text>
                <Text style={styles.infoValue}>{profile?.email ?? 'Pendiente'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sexo:</Text>
                <Text style={styles.infoValue}>
                  {getOptionLabel(genderOptions, profile?.sexo ?? null)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Actividad:</Text>
                <Text style={styles.infoValue}>
                  {getOptionLabel(activityOptions, profile?.nivel_actividad ?? null)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Peso:</Text>
                <Text style={styles.infoValue}>
                  {profile?.peso ? `${profile.peso} kg` : 'Pendiente'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Altura:</Text>
                <Text style={styles.infoValue}>
                  {profile?.altura ? `${profile.altura} cm` : 'Pendiente'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Objetivo:</Text>
                <Text style={styles.infoValue}>
                  {getOptionLabel(goalOptions, profile?.objetivo ?? null)}
                </Text>
              </View>

              <View style={[styles.infoRow, styles.infoRowLast]}>
                <Text style={styles.infoLabel}>Calorías diarias:</Text>
                <Text style={styles.infoValue}>
                  {profile?.calorias_diarias
                    ? `${Math.round(profile.calorias_diarias)} kcal`
                    : 'Pendiente'}
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Tipos de comida</Text>
              <Text style={styles.mealTypesText}>
                {mealTypes.map((mealType) => mealType.nombre).join(', ') || 'Pendiente'}
              </Text>
              <Button
                title="Configurar comidas"
                onPress={openMealTypesEdit}
                variant="outline"
                size="medium"
                style={styles.configureMealsButton}
              />
            </View>

            <View style={styles.buttonsContainer}>
              <Button
                title={isProfileComplete ? 'Editar' : 'Completar perfil'}
                onPress={openEdit}
                size="large"
                style={styles.editButton}
              />

              <Button
                title="Cerrar Sesión"
                onPress={handleLogout}
                variant="secondary"
                size="large"
                style={styles.logoutButton}
              />

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteAccount}
                accessibilityRole="button"
                accessibilityLabel="Eliminar cuenta"
              >
                <Text style={styles.deleteButtonText}>Eliminar cuenta</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={isDeleteModalVisible}
        transparent
        animationType="none"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <FontAwesome name="exclamation-triangle" size={48} color={Colors.error} />
            </View>

            <Text style={styles.modalTitle}>¿Eliminar cuenta?</Text>
            <Text style={styles.modalText}>
              Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar tu cuenta permanentemente?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelDelete}
                accessibilityRole="button"
                accessibilityLabel="Cancelar eliminación de cuenta"
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmDelete}
                accessibilityRole="button"
                accessibilityLabel="Confirmar eliminación de cuenta"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color={Colors.textWhite} />
                ) : (
                  <Text style={styles.confirmButtonText}>Eliminar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isMealTypesModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeMealTypesEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tipos de comida</Text>
            <Text style={styles.modalText}>
              Configura las comidas que aparecerán en la vista diaria.
            </Text>

            {[0, 1, 2].map((index) => (
              <Input
                key={index}
                label={`Comida ${index + 1}`}
                placeholder={index === 0 ? 'Desayuno' : index === 1 ? 'Comida' : 'Cena'}
                value={mealTypeNames[index]}
                onChangeText={(text) => {
                  const nextNames = [...mealTypeNames];
                  nextNames[index] = text;
                  setMealTypeNames(nextNames);
                  if (errors.form) setErrors({ ...errors, form: undefined });
                }}
              />
            ))}

            {errors.form && <Text style={styles.errorText}>{errors.form}</Text>}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeMealTypesEdit}
                accessibilityRole="button"
                accessibilityLabel="Cancelar configuración de comidas"
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveMealTypes}
                accessibilityRole="button"
                accessibilityLabel="Guardar tipos de comida"
                disabled={isSavingMealTypes}
              >
                {isSavingMealTypes ? (
                  <ActivityIndicator color={Colors.textWhite} />
                ) : (
                  <Text style={styles.confirmButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeEdit}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.editModalContent}>
            <Text style={styles.modalTitle}>Editar perfil</Text>

            <ScrollView
              style={styles.editFormScroll}
              contentContainerStyle={styles.editFormContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Input
                label="Nombre"
                placeholder="Tu nombre"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                autoCapitalize="words"
                error={errors.name}
                icon="user"
              />

              <Select
                label="Género"
                placeholder="Selecciona tu género"
                value={gender}
                onSelect={(value) => {
                  setGender(value);
                  if (errors.gender) setErrors({ ...errors, gender: undefined });
                }}
                options={genderOptions}
                error={errors.gender}
              />

              <DatePicker
                label="Fecha de nacimiento"
                placeholder="Selecciona tu fecha"
                value={birthDate}
                onSelect={(date) => {
                  setBirthDate(date);
                  if (errors.birthDate) {
                    setErrors({ ...errors, birthDate: undefined });
                  }
                }}
                error={errors.birthDate}
                maximumDate={maxDate}
                minimumDate={minDate}
              />

              <Select
                label="Actividad semanal"
                placeholder="Selecciona tu actividad"
                value={activity}
                onSelect={(value) => {
                  setActivity(value);
                  if (errors.activity) setErrors({ ...errors, activity: undefined });
                }}
                options={activityOptions}
                error={errors.activity}
              />

              <Select
                label="Tu objetivo"
                placeholder="Selecciona tu objetivo"
                value={goal}
                onSelect={(value) => {
                  setGoal(value);
                  if (errors.goal) setErrors({ ...errors, goal: undefined });
                }}
                options={goalOptions}
                error={errors.goal}
              />

              <NumberInput
                label="Peso"
                placeholder="0"
                value={weight}
                onChangeText={(text) => {
                  setWeight(text);
                  if (errors.weight) setErrors({ ...errors, weight: undefined });
                }}
                unit="kg"
                error={errors.weight}
                keyboardType="decimal-pad"
              />

              <NumberInput
                label="Altura"
                placeholder="0"
                value={height}
                onChangeText={(text) => {
                  setHeight(text);
                  if (errors.height) setErrors({ ...errors, height: undefined });
                }}
                unit="cm"
                error={errors.height}
                keyboardType="numeric"
              />

              {errors.form && <Text style={styles.errorText}>{errors.form}</Text>}
            </ScrollView>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeEdit}
                accessibilityRole="button"
                accessibilityLabel="Cancelar edición"
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProfile}
                accessibilityRole="button"
                accessibilityLabel="Guardar perfil"
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={Colors.textWhite} />
                ) : (
                  <Text style={styles.confirmButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: Colors.backgroundCard,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  loadingContainer: {
    paddingVertical: 60,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  incompleteBox: {
    backgroundColor: Colors.errorLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  incompleteText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 10,
  },
  mealTypesText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  configureMealsButton: {
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'right',
  },
  buttonsContainer: {
    gap: 12,
  },
  editButton: {
    width: '100%',
  },
  logoutButton: {
    width: '100%',
  },
  deleteButton: {
    backgroundColor: Colors.error,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonText: {
    color: Colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  editModalContent: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.backgroundSecondary,
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: Colors.error,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  confirmButtonText: {
    color: Colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  editFormScroll: {
    width: '100%',
  },
  editFormContent: {
    gap: 18,
    paddingBottom: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
});
