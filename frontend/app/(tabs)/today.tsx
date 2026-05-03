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
import { CameraView } from 'expo-camera';
import { FontAwesome } from '@expo/vector-icons';
import { FoodScannerModal } from '@/components/FoodScannerModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumberInput } from '@/components/ui/NumberInput';
import { Select } from '@/components/ui/Select';
import type { AppColors } from '@/constants/Colors';
import { useAppTheme } from '@/contexts/ThemeContext';
import { ApiError } from '@/services/api';
import { analysisService } from '@/services/analysis';
import { dailyLogService } from '@/services/dailyLog';
import { profileService } from '@/services/profile';
import { recommendationsService } from '@/services/recommendations';
import { templatesService } from '@/services/templates';
import type { AnalysisResponse } from '@/types/analysis';
import type { DailyEntry, DailyLog, Food, MealLog } from '@/types/dailyLog';
import type { Profile } from '@/types/profile';
import type { RecommendationResponse } from '@/types/recommendations';
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
  const { colors, effectiveTheme } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isCameraAvailable, setIsCameraAvailable] = useState(false);
  const [isAnalysisModalVisible, setIsAnalysisModalVisible] = useState(false);
  const [isRecommendationModalVisible, setIsRecommendationModalVisible] = useState(false);
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('');
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'g' | 'ml'>('g');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState(false);
  const [isAddingRecommendation, setIsAddingRecommendation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<DailyEntry | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [recommendationPrompt, setRecommendationPrompt] = useState('');
  const [recommendationMealType, setRecommendationMealType] = useState('');
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
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
    let isMounted = true;

    CameraView.isAvailableAsync()
      .then((available) => {
        if (isMounted) setIsCameraAvailable(available);
      })
      .catch(() => {
        if (isMounted) setIsCameraAvailable(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

  const openAnalysisModal = () => {
    setAnalysis(null);
    setAnalysisError(null);
    setIsAnalysisModalVisible(true);
  };

  const closeAnalysisModal = () => {
    if (!isGeneratingAnalysis) {
      setIsAnalysisModalVisible(false);
    }
  };

  const handleGenerateAnalysis = async () => {
    setIsGeneratingAnalysis(true);
    setAnalysisError(null);
    try {
      const result = await analysisService.createAnalysis({ fecha: dateKey });
      setAnalysis(result);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setAnalysisError(caughtError.detail);
      } else {
        setAnalysisError('No se pudo generar el analisis');
      }
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  const openRecommendationModal = () => {
    setRecommendationPrompt('');
    setRecommendationMealType(dailyLog?.meal_types[0] ?? 'Desayuno');
    setRecommendation(null);
    setRecommendationError(null);
    setIsRecommendationModalVisible(true);
  };

  const closeRecommendationModal = () => {
    if (!isGeneratingRecommendation && !isAddingRecommendation) {
      setIsRecommendationModalVisible(false);
    }
  };

  const handleGenerateRecommendation = async () => {
    if (!profile?.peso || !profile.calorias_diarias) {
      setRecommendationError('Completa tu perfil nutricional antes de pedir recomendaciones');
      return;
    }

    setIsGeneratingRecommendation(true);
    setRecommendationError(null);
    try {
      const result = await recommendationsService.createRecommendation({
        fecha: dateKey,
        prompt: recommendationPrompt.trim() || undefined,
      });
      setRecommendation(result);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setRecommendationError(caughtError.detail);
      } else {
        setRecommendationError('No se pudo generar la recomendacion');
      }
    } finally {
      setIsGeneratingRecommendation(false);
    }
  };

  const handleAddRecommendationToMeal = async () => {
    if (!recommendation) return;

    setIsAddingRecommendation(true);
    setRecommendationError(null);
    try {
      const updatedLog = await recommendationsService.addRecommendationToMeal(
        recommendation.id,
        {
          fecha: dateKey,
          tipo: recommendationMealType,
        },
      );
      setDailyLog(updatedLog);
      setIsRecommendationModalVisible(false);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setRecommendationError(caughtError.detail);
      } else {
        setRecommendationError('No se pudo anadir la recomendacion');
      }
    } finally {
      setIsAddingRecommendation(false);
    }
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

  const handleScannedFood = (food: Food) => {
    handleSelectFood(food);
    setFoods([food]);
    setError(null);
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

  const openDeleteEntryModal = (entry: DailyEntry) => {
    setEntryToDelete(entry);
  };

  const closeDeleteEntryModal = () => {
    if (!deletingEntryId) {
      setEntryToDelete(null);
    }
  };

  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;

    const entryId = entryToDelete.id;
    setDeletingEntryId(entryId);
    setError(null);
    try {
      await dailyLogService.deleteEntry(entryId);
      setDailyLog((currentLog) => {
        if (!currentLog) return currentLog;

        const nextMeals = currentLog.meals.map((meal) => {
          const nextEntries = meal.entries.filter((entry) => entry.id !== entryId);
          const nextTotals = nextEntries.reduce(
            (totalsByMeal, entry) => ({
              calorias: totalsByMeal.calorias + entry.calorias,
              proteinas: totalsByMeal.proteinas + entry.proteinas,
              carbohidratos: totalsByMeal.carbohidratos + entry.carbohidratos,
              grasas: totalsByMeal.grasas + entry.grasas,
            }),
            { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
          );

          return {
            ...meal,
            entries: nextEntries,
            calorias: round(nextTotals.calorias),
            proteinas: round(nextTotals.proteinas),
            carbohidratos: round(nextTotals.carbohidratos),
            grasas: round(nextTotals.grasas),
          };
        });

        const nextTotals = nextMeals.reduce(
          (totalsByDay, meal) => ({
            calorias: totalsByDay.calorias + meal.calorias,
            proteinas: totalsByDay.proteinas + meal.proteinas,
            carbohidratos: totalsByDay.carbohidratos + meal.carbohidratos,
            grasas: totalsByDay.grasas + meal.grasas,
          }),
          { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
        );

        return {
          ...currentLog,
          meals: nextMeals,
          totals: {
            calorias: round(nextTotals.calorias),
            proteinas: round(nextTotals.proteinas),
            carbohidratos: round(nextTotals.carbohidratos),
            grasas: round(nextTotals.grasas),
          },
        };
      });
      setEntryToDelete(null);
      await loadDailyData();
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.detail);
      } else {
        setError('No se pudo eliminar el alimento');
      }
    } finally {
      setDeletingEntryId(null);
    }
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
          <FontAwesome name="plus" size={18} color={colors.textWhite} />
        </TouchableOpacity>
      </View>
      {meal.entries.length > 0 ? (
        <View style={styles.entriesTable}>
          <Text style={styles.mealTotal}>Total: {round(meal.calorias)} Kcal</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.foodCell]}>Alimento</Text>
            <Text style={styles.tableCell}>Cantidad</Text>
            <Text style={styles.tableCell}>Kcal</Text>
            <Text style={styles.actionHeaderCell}> </Text>
          </View>
          {meal.entries.map((entry) => (
            <View key={entry.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.foodCell]}>{entry.alimento_nombre}</Text>
              <Text style={styles.tableCell}>{entry.cantidad} {entry.unidad}</Text>
              <Text style={styles.tableCell}>{round(entry.calorias)}</Text>
              <TouchableOpacity
                style={styles.deleteEntryButton}
                onPress={() => openDeleteEntryModal(entry)}
                disabled={deletingEntryId === entry.id}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar ${entry.alimento_nombre}`}
              >
                {deletingEntryId === entry.id ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <FontAwesome name="trash" size={14} color={colors.error} />
                )}
              </TouchableOpacity>
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
      <StatusBar barStyle={effectiveTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
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
            <ActivityIndicator color={colors.primary} />
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
                <FontAwesome name="chevron-left" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.dayText}>{formatDisplayDate(selectedDate)}</Text>
              <TouchableOpacity onPress={() => setSelectedDate(addDays(selectedDate, 1))}>
                <FontAwesome name="chevron-right" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {meals.map(renderMeal)}

            <TouchableOpacity
              style={[styles.aiButton, styles.analysisButton]}
              onPress={openAnalysisModal}
              accessibilityRole="button"
              accessibilityLabel="Analizar dieta con IA"
            >
              <View style={styles.aiButtonTextGroup}>
                <Text style={styles.aiButtonTitle}>Analizar dieta</Text>
                <Text style={styles.aiButtonSubtitle}>Ultimos 7 dias registrados</Text>
              </View>
              <FontAwesome name="bar-chart" size={22} color={colors.textWhite} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiButton}
              onPress={openRecommendationModal}
              accessibilityRole="button"
              accessibilityLabel="Pedir recomendacion de IA"
            >
              <View style={styles.aiButtonTextGroup}>
                <Text style={styles.aiButtonTitle}>Recomendacion IA</Text>
                <Text style={styles.aiButtonSubtitle}>Segun lo que llevas hoy</Text>
              </View>
              <FontAwesome name="magic" size={22} color={colors.textWhite} />
            </TouchableOpacity>

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
        visible={isAnalysisModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeAnalysisModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Analisis IA</Text>

            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {!analysis && (
                <View style={styles.remainingBox}>
                  <Text style={styles.remainingTitle}>Historial reciente</Text>
                  <Text style={styles.remainingText}>
                    Se analizaran los ultimos 7 dias. Necesitas al menos 3 dias con comidas.
                  </Text>
                </View>
              )}

              {analysisError && <Text style={styles.errorText}>{analysisError}</Text>}

              {analysis && (
                <View style={styles.analysisCard}>
                  <View style={styles.analysisTable}>
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisLabel}>Proteinas</Text>
                      <Text style={styles.analysisValue}>{analysis.estado_proteinas}</Text>
                    </View>
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisLabel}>Carbohidratos</Text>
                      <Text style={styles.analysisValue}>{analysis.estado_carbohidratos}</Text>
                    </View>
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisLabel}>Grasas</Text>
                      <Text style={styles.analysisValue}>{analysis.estado_grasas}</Text>
                    </View>
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisLabel}>Micronutrientes</Text>
                      <Text style={styles.analysisValue}>{analysis.estado_micronutrientes}</Text>
                    </View>
                  </View>

                  <Text style={styles.analysisAdvice}>Consejo: {analysis.consejo}</Text>
                  <Text style={styles.analysisScore}>
                    Puntuacion: {Math.round(analysis.puntuacion)}/100
                  </Text>
                  <Text style={styles.analysisDays}>
                    {analysis.dias_analizados} dias analizados
                  </Text>
                </View>
              )}

              {!analysis && (
                <Button
                  title="Analizar dieta"
                  onPress={handleGenerateAnalysis}
                  loading={isGeneratingAnalysis}
                  size="large"
                  style={styles.modalActionButton}
                />
              )}
              {analysis && (
                <Button
                  title="Reanalizar"
                  onPress={handleGenerateAnalysis}
                  loading={isGeneratingAnalysis}
                  size="large"
                  style={styles.modalActionButton}
                />
              )}
              <Button
                title={analysis ? 'Aceptar' : 'Cancelar'}
                onPress={closeAnalysisModal}
                variant={analysis ? 'primary' : 'secondary'}
                size="large"
                style={styles.modalActionButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                  <ActivityIndicator color={colors.primary} />
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
                <FontAwesome name="file-text-o" size={22} color={colors.textSecondary} />
              </TouchableOpacity>

              {isCameraAvailable && (
                <TouchableOpacity
                  style={styles.qrButton}
                  onPress={() => setIsScannerVisible(true)}
                >
                  <Text style={styles.qrButtonText}>Escanear QR</Text>
                  <FontAwesome name="qrcode" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              )}

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

      <FoodScannerModal
        visible={isScannerVisible}
        onClose={() => setIsScannerVisible(false)}
        onFoodScanned={handleScannedFood}
      />

      <Modal
        visible={isRecommendationModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeRecommendationModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recomendacion IA</Text>

            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Input
                label="Que te apetece?"
                placeholder="Algo ligero con arroz, por ejemplo"
                value={recommendationPrompt}
                onChangeText={setRecommendationPrompt}
                icon="magic"
              />

              <View style={styles.remainingBox}>
                <Text style={styles.remainingTitle}>Restante aproximado</Text>
                <Text style={styles.remainingText}>
                  {Math.max(0, round(caloriesGoal - totals.calorias))} Kcal ·{' '}
                  {Math.max(0, round(proteinGoal - totals.proteinas))}g proteinas
                </Text>
              </View>

              {recommendationError && (
                <Text style={styles.errorText}>{recommendationError}</Text>
              )}

              {recommendation && (
                <View style={styles.recommendationCard}>
                  <View style={styles.recommendationHeader}>
                    <View style={styles.recommendationIcon}>
                      <FontAwesome name="magic" size={18} color={colors.textWhite} />
                    </View>
                    <View style={styles.recommendationTitleGroup}>
                      <Text style={styles.recommendationTitle}>
                        {recommendation.contenido.nombre}
                      </Text>
                      <Text style={styles.recommendationMeta}>
                        {round(recommendation.contenido.calorias)} Kcal ·{' '}
                        {round(recommendation.contenido.proteinas)}g proteinas
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recommendationTable}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCell, styles.foodCell]}>Alimento</Text>
                      <Text style={styles.tableCell}>Cantidad</Text>
                      <Text style={styles.tableCell}>Kcal</Text>
                    </View>
                    {recommendation.contenido.alimentos.map((food, index) => (
                      <View key={`${food.nombre}-${index}`} style={styles.tableRow}>
                        <Text style={[styles.tableCell, styles.foodCell]}>{food.nombre}</Text>
                        <Text style={styles.tableCell}>
                          {round(food.cantidad)} {food.unidad}
                        </Text>
                        <Text style={styles.tableCell}>{round(food.calorias)}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.recommendationMacroRow}>
                    <Text style={styles.recommendationMacro}>
                      C {round(recommendation.contenido.carbohidratos)}g
                    </Text>
                    <Text style={styles.recommendationMacro}>
                      P {round(recommendation.contenido.proteinas)}g
                    </Text>
                    <Text style={styles.recommendationMacro}>
                      G {round(recommendation.contenido.grasas)}g
                    </Text>
                  </View>

                  <Text style={styles.recommendationText}>
                    {recommendation.contenido.explicacion}
                  </Text>

                  <Text style={styles.recommendationMeta}>
                    Restantes: {round(recommendation.calorias_restantes)} Kcal ·{' '}
                    {round(recommendation.proteinas_restantes)}g proteinas ·{' '}
                    {round(recommendation.carbohidratos_restantes)}g carbos ·{' '}
                    {round(recommendation.grasas_restantes)}g grasas
                  </Text>
                </View>
              )}

              {recommendation && (
                <>
                  <Select
                    label="Anadir a comida"
                    placeholder="Selecciona tipo"
                    value={recommendationMealType}
                    onSelect={setRecommendationMealType}
                    options={mealTypeOptions}
                  />
                  <Button
                    title="Anadir a comida"
                    onPress={handleAddRecommendationToMeal}
                    loading={isAddingRecommendation}
                    size="large"
                    style={styles.modalActionButton}
                  />
                </>
              )}

              <Button
                title={recommendation ? 'Reintentar' : 'Generar recomendacion'}
                onPress={handleGenerateRecommendation}
                loading={isGeneratingRecommendation}
                size="large"
                style={styles.modalActionButton}
              />
              <Button
                title="Cerrar"
                onPress={closeRecommendationModal}
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
                <ActivityIndicator color={colors.primary} />
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
                    <FontAwesome name="chevron-right" size={16} color={colors.textLight} />
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
                <FontAwesome name="folder-open" size={48} color={colors.border} />
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

      <Modal
        visible={entryToDelete !== null}
        transparent
        animationType="none"
        onRequestClose={closeDeleteEntryModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmTitle}>Eliminar alimento</Text>
            <Text style={styles.confirmText}>
              {`Seguro que quieres eliminar "${entryToDelete?.alimento_nombre}" del diario?`}
            </Text>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <Button
              title="Eliminar"
              onPress={handleDeleteEntry}
              loading={deletingEntryId !== null}
              size="large"
              style={styles.modalActionButton}
            />
            <Button
              title="Cancelar"
              onPress={closeDeleteEntryModal}
              variant="secondary"
              size="large"
              style={styles.modalActionButton}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: colors.background,
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
    color: colors.text,
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 60,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 8,
  },
  summaryCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    shadowColor: colors.shadow,
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
    borderColor: colors.primaryLight,
    borderLeftColor: colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calorieValue: {
    fontSize: 22,
    color: colors.text,
    fontWeight: '800',
  },
  calorieGoal: {
    fontSize: 18,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    fontWeight: '600',
  },
  macroBarTrack: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    backgroundColor: colors.primaryLight,
  },
  proteinFill: {
    backgroundColor: colors.secondaryLight,
  },
  fatFill: {
    backgroundColor: colors.textSecondary,
  },
  macroValue: {
    fontSize: 12,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  mealSection: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  mealHeader: {
    backgroundColor: colors.primaryMuted,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealTitle: {
    color: colors.textSecondary,
    fontSize: 17,
    fontWeight: '700',
  },
  addMealButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entriesTable: {
    padding: 16,
  },
  mealTotal: {
    color: colors.text,
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
    alignItems: 'center',
  },
  tableCell: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  foodCell: {
    flex: 1.4,
    textAlign: 'left',
  },
  actionHeaderCell: {
    width: 34,
  },
  deleteEntryButton: {
    width: 34,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  emptyMealText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
    padding: 18,
    textAlign: 'center',
  },
  addButton: {
    width: '100%',
    marginTop: 4,
  },
  aiButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analysisButton: {
    backgroundColor: colors.secondary,
  },
  aiButtonTextGroup: {
    flex: 1,
  },
  aiButtonTitle: {
    color: colors.textWhite,
    fontSize: 17,
    fontWeight: '800',
  },
  aiButtonSubtitle: {
    color: colors.textWhite,
    opacity: 0.85,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
  },
  confirmModalContent: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    gap: 14,
  },
  confirmTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  confirmText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
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
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  foodResult: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  foodResultSelected: {
    backgroundColor: colors.primaryMuted,
  },
  foodName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  foodMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  emptyResultsText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  energyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 14,
  },
  energyLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  energyValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  analysisCard: {
    gap: 18,
  },
  analysisTable: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    overflow: 'hidden',
  },
  analysisRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  analysisLabel: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  analysisValue: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 10,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  analysisAdvice: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  analysisScore: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  analysisDays: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  remainingBox: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    padding: 14,
  },
  remainingTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  remainingText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  recommendationCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recommendationIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationTitleGroup: {
    flex: 1,
  },
  recommendationTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 3,
  },
  recommendationTable: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 12,
  },
  recommendationMacroRow: {
    flexDirection: 'row',
    gap: 8,
  },
  recommendationMacro: {
    flex: 1,
    backgroundColor: colors.primaryMuted,
    borderRadius: 10,
    paddingVertical: 8,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  recommendationMeta: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  recommendationText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
  },
  qrButton: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '800',
  },
  templateButton: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateButtonText: {
    color: colors.textSecondary,
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
    borderColor: colors.borderLight,
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
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  templatePickerMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyTemplatePicker: {
    alignItems: 'center',
    gap: 14,
  },
  emptyTemplateTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyTemplateText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalActionButton: {
    width: '100%',
  },
});
