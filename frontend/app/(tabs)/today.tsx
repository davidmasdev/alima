import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumberInput } from '@/components/ui/NumberInput';
import { Select } from '@/components/ui/Select';
import { Colors } from '@/constants/Colors';
import { ApiError } from '@/services/api';
import { dailyLogService } from '@/services/dailyLog';
import { profileService } from '@/services/profile';
import { templatesService } from '@/services/templates';
import type { DailyLog, Food, MealLog } from '@/types/dailyLog';
import type { Profile } from '@/types/profile';
import type { MealTemplate } from '@/types/templates';

const unitOptions = [
  { value: 'g', label: 'Gramos' },
  { value: 'ml', label: 'Mililitros' },
];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function addDays(date: Date, amount: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export default function TodayScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('');
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'g' | 'ml'>('g');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateKey = useMemo(() => formatDate(selectedDate), [selectedDate]);

  const loadDailyData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [log, profileData] = await Promise.all([
        dailyLogService.getDailyLog(dateKey),
        profileService.getProfile(),
      ]);
      setDailyLog(log);
      setProfile(profileData);
    } catch {
      setError('No se pudo cargar el diario');
    } finally {
      setIsLoading(false);
    }
  }, [dateKey]);

  useEffect(() => {
    loadDailyData();
  }, [loadDailyData]);

  useEffect(() => {
    let isActive = true;
    const timer = setTimeout(async () => {
      if (!isAddModalVisible) return;
      setIsSearching(true);
      try {
        const results = await dailyLogService.searchFoods(query);
        if (isActive) setFoods(results);
      } catch {
        if (isActive) setFoods([]);
      } finally {
        if (isActive) setIsSearching(false);
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [query, isAddModalVisible]);

  const openAddModal = (mealType?: string) => {
    const fallbackMealType = mealType ?? dailyLog?.meal_types[0] ?? 'Desayuno';
    setSelectedMealType(fallbackMealType);
    setQuery('');
    setFoods([]);
    setSelectedFood(null);
    setQuantity('');
    setUnit('g');
    setError(null);
    setIsAddModalVisible(true);
  };

  const closeAddModal = () => {
    setIsAddModalVisible(false);
  };

  const openTemplateModal = async () => {
    setIsTemplateModalVisible(true);
    setIsLoadingTemplates(true);
    setError(null);
    try {
      const data = await templatesService.listTemplates('recent');
      setTemplates(data);
    } catch {
      setError('No se pudieron cargar las plantillas');
      setTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const closeTemplateModal = () => {
    setIsTemplateModalVisible(false);
  };

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setQuery(food.nombre);
    setUnit(food.unidad_base);
    setQuantity('100');
  };

  const calculatedEnergy = selectedFood && quantity
    ? round((selectedFood.calorias * Number(quantity)) / 100)
    : 0;

  const handleAddEntry = async () => {
    if (!selectedFood) {
      setError('Selecciona un alimento');
      return;
    }
    if (!quantity.trim() || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      setError('Ingresa una cantidad válida');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await dailyLogService.addEntry({
        fecha: dateKey,
        tipo: selectedMealType,
        alimento_id: selectedFood.id,
        cantidad: Number(quantity),
        unidad: unit,
      });
      setIsAddModalVisible(false);
      await loadDailyData();
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.detail);
      } else {
        setError('No se pudo añadir el alimento');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyTemplate = async (template: MealTemplate) => {
    setIsSaving(true);
    setError(null);
    try {
      const updatedLog = await dailyLogService.addFromTemplate({
        fecha: dateKey,
        tipo: selectedMealType,
        template_id: template.id,
      });
      setDailyLog(updatedLog);
      setIsTemplateModalVisible(false);
      setIsAddModalVisible(false);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.detail);
      } else {
        setError('No se pudo anadir la plantilla');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const goToTemplates = () => {
    setIsTemplateModalVisible(false);
    setIsAddModalVisible(false);
    router.push('/(tabs)/templates');
  };

  const mealTypeOptions = (dailyLog?.meal_types ?? ['Desayuno', 'Comida', 'Cena']).map((mealType) => ({
    value: mealType,
    label: mealType,
  }));

  const caloriesGoal = profile?.calorias_diarias ?? 1700;
  const proteinGoal = profile?.peso ? profile.peso * 1.2 : 79;
  const fatGoal = profile?.peso ? profile.peso * 0.8 : 60;
  const carbGoal = caloriesGoal ? (caloriesGoal * 0.5) / 4 : 225;

  const totals = dailyLog?.totals ?? { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 };
  const meals = dailyLog?.meals ?? [];

  const renderMeal = (meal: MealLog) => (
    <View key={meal.tipo} style={styles.mealSection}>
      <View style={styles.mealHeader}>
        <Text style={styles.mealTitle}>{meal.tipo}</Text>
        <TouchableOpacity
          style={styles.addMealButton}
          onPress={() => openAddModal(meal.tipo)}
          accessibilityRole="button"
          accessibilityLabel={`Añadir alimento a ${meal.tipo}`}
        >
          <FontAwesome name="plus" size={18} color={Colors.textWhite} />
        </TouchableOpacity>
      </View>
      {meal.entries.length > 0 ? (
        <View style={styles.entriesTable}>
          <Text style={styles.mealTotal}>Total: {round(meal.calorias)} Kcal</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.foodCell]}>Alimento</Text>
            <Text style={styles.tableCell}>Cantidad</Text>
            <Text style={styles.tableCell}>Kcal</Text>
          </View>
          {meal.entries.map((entry) => (
            <View key={entry.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.foodCell]}>{entry.alimento_nombre}</Text>
              <Text style={styles.tableCell}>{entry.cantidad} {entry.unidad}</Text>
              <Text style={styles.tableCell}>{round(entry.calorias)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyMealText}>Sin alimentos registrados</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.headerBackground} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Hoy</Text>
          <Text style={styles.date}>Registro nutricional diario</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <>
            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.summaryCard}>
              <View style={styles.calorieRing}>
                <Text style={styles.calorieValue}>{Math.round(totals.calorias)}</Text>
                <Text style={styles.calorieGoal}>/{Math.round(caloriesGoal)}</Text>
              </View>
              <View style={styles.macroList}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Carbohidratos</Text>
                  <View style={styles.macroBarTrack}>
                    <View style={[styles.macroBarFill, { width: `${Math.min(100, (totals.carbohidratos / carbGoal) * 100)}%` }]} />
                  </View>
                  <Text style={styles.macroValue}>{round(totals.carbohidratos)}/{Math.round(carbGoal)}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Proteínas</Text>
                  <View style={styles.macroBarTrack}>
                    <View style={[styles.macroBarFill, styles.proteinFill, { width: `${Math.min(100, (totals.proteinas / proteinGoal) * 100)}%` }]} />
                  </View>
                  <Text style={styles.macroValue}>{round(totals.proteinas)}/{Math.round(proteinGoal)}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroLabel}>Grasas</Text>
                  <View style={styles.macroBarTrack}>
                    <View style={[styles.macroBarFill, styles.fatFill, { width: `${Math.min(100, (totals.grasas / fatGoal) * 100)}%` }]} />
                  </View>
                  <Text style={styles.macroValue}>{round(totals.grasas)}/{Math.round(fatGoal)}g</Text>
                </View>
              </View>
            </View>

            <View style={styles.dateNavigator}>
              <TouchableOpacity onPress={() => setSelectedDate(addDays(selectedDate, -1))}>
                <FontAwesome name="chevron-left" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.dayText}>{formatDisplayDate(selectedDate)}</Text>
              <TouchableOpacity onPress={() => setSelectedDate(addDays(selectedDate, 1))}>
                <FontAwesome name="chevron-right" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {meals.map(renderMeal)}

            <Button
              title="Añadir comida"
              onPress={() => openAddModal()}
              size="large"
              style={styles.addButton}
            />
          </>
        )}
      </ScrollView>

      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeAddModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Añadir comida</Text>

            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Select
                label="Tipo de comida"
                placeholder="Selecciona tipo"
                value={selectedMealType}
                onSelect={setSelectedMealType}
                options={mealTypeOptions}
              />

              <Input
                label="Buscar alimento"
                placeholder="Arroz"
                value={query}
                onChangeText={(text) => {
                  setQuery(text);
                  setSelectedFood(null);
                }}
                icon="search"
              />

              <View style={styles.resultsBox}>
                {isSearching ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : foods.length > 0 ? (
                  foods.map((food) => (
                    <TouchableOpacity
                      key={food.id}
                      style={[
                        styles.foodResult,
                        selectedFood?.id === food.id && styles.foodResultSelected,
                      ]}
                      onPress={() => handleSelectFood(food)}
                    >
                      <Text style={styles.foodName}>{food.nombre}</Text>
                      <Text style={styles.foodMeta}>
                        {food.calorias} Kcal / 100{food.unidad_base}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.emptyResultsText}>Busca un alimento</Text>
                )}
              </View>

              <NumberInput
                label="Cantidad"
                placeholder="0"
                value={quantity}
                onChangeText={setQuantity}
                unit={unit}
                keyboardType="decimal-pad"
              />

              <Select
                label="Unidad"
                placeholder="Selecciona unidad"
                value={unit}
                onSelect={(value) => setUnit(value as 'g' | 'ml')}
                options={unitOptions}
              />

              <View style={styles.energyRow}>
                <Text style={styles.energyLabel}>Energía</Text>
                <Text style={styles.energyValue}>{calculatedEnergy} Kcal</Text>
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={styles.templateButton}
                onPress={openTemplateModal}
              >
                <Text style={styles.templateButtonText}>Anadir desde plantilla</Text>
                <FontAwesome name="file-text-o" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.qrButton}
                onPress={() => setError('Escaneo QR disponible en RF-011')}
              >
                <Text style={styles.qrButtonText}>Escanear QR</Text>
                <FontAwesome name="qrcode" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>

              <Button
                title="Añadir"
                onPress={handleAddEntry}
                loading={isSaving}
                size="large"
                style={styles.modalActionButton}
              />
              <Button
                title="Cancelar"
                onPress={closeAddModal}
                variant="secondary"
                size="large"
                style={styles.modalActionButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isTemplateModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeTemplateModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Elegir plantilla</Text>

            {isLoadingTemplates ? (
              <View style={styles.templateLoadingBox}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : templates.length > 0 ? (
              <ScrollView
                contentContainerStyle={styles.templatePickerContent}
                showsVerticalScrollIndicator={false}
              >
                {templates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.templatePickerItem}
                    onPress={() => handleApplyTemplate(template)}
                    disabled={isSaving}
                    accessibilityRole="button"
                    accessibilityLabel={`Usar plantilla ${template.nombre}`}
                  >
                    <View style={styles.templatePickerTextGroup}>
                      <Text style={styles.templatePickerName}>{template.nombre}</Text>
                      <Text style={styles.templatePickerMeta}>
                        {template.items.length} alimentos - {round(template.calorias)} Kcal
                      </Text>
                    </View>
                    <FontAwesome name="chevron-right" size={16} color={Colors.textLight} />
                  </TouchableOpacity>
                ))}

                {error && <Text style={styles.errorText}>{error}</Text>}

                <Button
                  title="Cancelar"
                  onPress={closeTemplateModal}
                  variant="secondary"
                  size="large"
                  style={styles.modalActionButton}
                />
              </ScrollView>
            ) : (
              <View style={styles.emptyTemplatePicker}>
                <FontAwesome name="folder-open" size={48} color={Colors.border} />
                <Text style={styles.emptyTemplateTitle}>No hay plantillas</Text>
                <Text style={styles.emptyTemplateText}>
                  Crea una plantilla para anadir comidas completas desde aqui
                </Text>
                {error && <Text style={styles.errorText}>{error}</Text>}
                <Button
                  title="Crear plantilla"
                  onPress={goToTemplates}
                  size="large"
                  style={styles.modalActionButton}
                />
                <Button
                  title="Cancelar"
                  onPress={closeTemplateModal}
                  variant="secondary"
                  size="large"
                  style={styles.modalActionButton}
                />
              </View>
            )}
          </View>
        </View>
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
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 60,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 8,
  },
  summaryCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  calorieRing: {
    width: 105,
    height: 105,
    borderRadius: 52,
    borderWidth: 5,
    borderColor: Colors.primaryLight,
    borderLeftColor: Colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calorieValue: {
    fontSize: 22,
    color: Colors.text,
    fontWeight: '800',
  },
  calorieGoal: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  macroList: {
    flex: 1,
    gap: 12,
  },
  macroItem: {
    gap: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  macroBarTrack: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    backgroundColor: Colors.primaryLight,
  },
  proteinFill: {
    backgroundColor: Colors.secondaryLight,
  },
  fatFill: {
    backgroundColor: Colors.textSecondary,
  },
  macroValue: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dateNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  dayText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  mealSection: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  mealHeader: {
    backgroundColor: Colors.primaryMuted,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealTitle: {
    color: Colors.textSecondary,
    fontSize: 17,
    fontWeight: '700',
  },
  addMealButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entriesTable: {
    padding: 16,
  },
  mealTotal: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  tableCell: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  foodCell: {
    flex: 1.4,
    textAlign: 'left',
  },
  emptyMealText: {
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: '600',
    padding: 18,
    textAlign: 'center',
  },
  addButton: {
    width: '100%',
    marginTop: 4,
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
    padding: 24,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 18,
    textAlign: 'center',
  },
  modalScrollContent: {
    gap: 16,
    paddingBottom: 4,
  },
  resultsBox: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  foodResult: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  foodResultSelected: {
    backgroundColor: Colors.primaryMuted,
  },
  foodName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  foodMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  emptyResultsText: {
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  energyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: 14,
  },
  energyLabel: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  energyValue: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  qrButton: {
    backgroundColor: Colors.primaryMuted,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '800',
  },
  templateButton: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '800',
  },
  templateLoadingBox: {
    paddingVertical: 48,
  },
  templatePickerContent: {
    gap: 12,
    paddingBottom: 4,
  },
  templatePickerItem: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  templatePickerTextGroup: {
    flex: 1,
  },
  templatePickerName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  templatePickerMeta: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyTemplatePicker: {
    alignItems: 'center',
    gap: 14,
  },
  emptyTemplateTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyTemplateText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalActionButton: {
    width: '100%',
  },
});
