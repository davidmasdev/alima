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
import { useFocusEffect, useRouter } from 'expo-router';
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

type AddFlowStep = 'choose' | 'search' | 'confirm' | 'templates';

const quickQuantities = ['50', '100', '150', '200'];

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
  const [isAnalysisModalVisible, setIsAnalysisModalVisible] = useState(false);
  const [isRecommendationModalVisible, setIsRecommendationModalVisible] = useState(false);
  const [addFlowStep, setAddFlowStep] = useState<AddFlowStep>('choose');
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

  useFocusEffect(
    useCallback(() => {
      loadDailyData();
    }, [loadDailyData]),
  );

  useEffect(() => {
    let isActive = true;
    const timer = setTimeout(async () => {
      if (!isAddModalVisible || addFlowStep !== 'search') return;
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
  }, [query, isAddModalVisible, addFlowStep]);

  const openAddModal = (mealType?: string) => {
    const fallbackMealType = mealType ?? dailyLog?.meal_types[0] ?? 'Desayuno';
    setSelectedMealType(fallbackMealType);
    setAddFlowStep('choose');
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
    setAddFlowStep('templates');
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

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setQuery(food.nombre);
    setUnit(food.unidad_base);
    setQuantity('100');
    setAddFlowStep('confirm');
    setError(null);
  };

  const handleScannedFood = (food: Food) => {
    handleSelectFood(food);
    setFoods([food]);
    setError(null);
    setIsScannerVisible(false);
    setIsAddModalVisible(true);
  };

  const closeScannerModal = () => {
    setIsScannerVisible(false);
    setIsAddModalVisible(true);
    if (!selectedFood) {
      setAddFlowStep('choose');
    }
  };

  const openScannerModal = () => {
    setIsAddModalVisible(false);
    setTimeout(() => {
      setIsScannerVisible(true);
    }, 250);
  };

  const openSearchStep = () => {
    setAddFlowStep('search');
    setError(null);
  };

  const backToChooseStep = () => {
    setAddFlowStep('choose');
    setSelectedFood(null);
    setError(null);
  };

  const calculatedEnergy = selectedFood && quantity
    ? round((selectedFood.calorias * Number(quantity)) / 100)
    : 0;
  const calculatedProtein = selectedFood && quantity
    ? round((selectedFood.proteinas * Number(quantity)) / 100)
    : 0;
  const calculatedCarbs = selectedFood && quantity
    ? round((selectedFood.carbohidratos * Number(quantity)) / 100)
    : 0;
  const calculatedFat = selectedFood && quantity
    ? round((selectedFood.grasas * Number(quantity)) / 100)
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
  const addModalTitle = addFlowStep === 'confirm'
    ? `Confirmar ${selectedMealType}`
    : addFlowStep === 'templates'
      ? 'Elegir plantilla'
      : `Añadir a ${selectedMealType}`;
  const selectedFoodOrigin = [selectedFood?.marca, selectedFood?.supermercado]
    .filter(Boolean)
    .join(' · ');

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
              style={styles.aiButton}
              onPress={openAnalysisModal}
              accessibilityRole="button"
              accessibilityLabel="Analizar dieta con IA"
            >
              <View style={styles.aiButtonTextGroup}>
                <Text style={styles.aiButtonTitle}>Analizar dieta</Text>
                <Text style={styles.aiButtonSubtitle}>Ultimos 7 dias registrados</Text>
              </View>
              <View style={styles.aiIconCircle}>
                <FontAwesome name="bar-chart" size={20} color={colors.primaryDark} />
              </View>
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
              <View style={styles.aiIconCircle}>
                <FontAwesome name="magic" size={20} color={colors.primaryDark} />
              </View>
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
            <View style={styles.addModalHeader}>
              {addFlowStep !== 'choose' ? (
                <TouchableOpacity
                  style={styles.addBackButton}
                  onPress={backToChooseStep}
                  accessibilityRole="button"
                  accessibilityLabel="Volver a opciones de añadir"
                >
                  <FontAwesome name="arrow-left" size={16} color={colors.text} />
                </TouchableOpacity>
              ) : (
                <View style={styles.addBackButtonPlaceholder} />
              )}
              <Text style={styles.addModalTitle}>{addModalTitle}</Text>
              <TouchableOpacity
                style={styles.addCloseButton}
                onPress={closeAddModal}
                accessibilityRole="button"
                accessibilityLabel="Cerrar añadir alimento"
              >
                <FontAwesome name="times" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {mealTypeOptions.length > 1 && (
                <View style={styles.mealTypeChips}>
                  {mealTypeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.mealTypeChip,
                        selectedMealType === option.value && styles.mealTypeChipSelected,
                      ]}
                      onPress={() => setSelectedMealType(option.value)}
                      accessibilityRole="button"
                      accessibilityLabel={`Añadir a ${option.label}`}
                    >
                      <Text
                        style={[
                          styles.mealTypeChipText,
                          selectedMealType === option.value && styles.mealTypeChipTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {addFlowStep === 'choose' && (
                <>
                  <Text style={styles.addIntroText}>Elige una forma de registrar la comida.</Text>
                  <TouchableOpacity
                    style={[styles.addMethodCard, styles.addMethodCardPrimary]}
                    onPress={openSearchStep}
                    accessibilityRole="button"
                    accessibilityLabel="Buscar alimento"
                  >
                    <View style={styles.addMethodIcon}>
                      <FontAwesome name="search" size={20} color={colors.textWhite} />
                    </View>
                    <View style={styles.addMethodTextGroup}>
                      <Text style={styles.addMethodTitle}>Buscar alimento</Text>
                      <Text style={styles.addMethodText}>Arroz, yogur, pollo...</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={16} color={colors.textLight} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addMethodCard}
                    onPress={openScannerModal}
                    accessibilityRole="button"
                    accessibilityLabel="Escanear código"
                  >
                    <View style={[styles.addMethodIcon, styles.addMethodIconSecondary]}>
                      <FontAwesome name="qrcode" size={20} color={colors.primaryDark} />
                    </View>
                    <View style={styles.addMethodTextGroup}>
                      <Text style={styles.addMethodTitle}>Escanear código</Text>
                      <Text style={styles.addMethodText}>Usa el código del producto.</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={16} color={colors.textLight} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addMethodCard}
                    onPress={openTemplateModal}
                    accessibilityRole="button"
                    accessibilityLabel="Usar plantilla"
                  >
                    <View style={[styles.addMethodIcon, styles.addMethodIconSecondary]}>
                      <FontAwesome name="file-text-o" size={20} color={colors.primaryDark} />
                    </View>
                    <View style={styles.addMethodTextGroup}>
                      <Text style={styles.addMethodTitle}>Usar plantilla</Text>
                      <Text style={styles.addMethodText}>Añade una comida ya guardada.</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={16} color={colors.textLight} />
                  </TouchableOpacity>
                </>
              )}

              {addFlowStep === 'search' && (
                <>
                  <Input
                    label="Buscar alimento"
                    placeholder="Busca arroz, yogur, pollo..."
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
                      foods.map((food) => {
                        const foodOrigin = [food.marca, food.supermercado].filter(Boolean).join(' · ');
                        return (
                          <TouchableOpacity
                            key={food.id}
                            style={styles.foodResult}
                            onPress={() => handleSelectFood(food)}
                            accessibilityRole="button"
                            accessibilityLabel={`Seleccionar ${food.nombre}`}
                          >
                            <View style={styles.foodResultTextGroup}>
                              <Text style={styles.foodName}>{food.nombre}</Text>
                              {foodOrigin ? (
                                <Text style={styles.foodOrigin}>{foodOrigin}</Text>
                              ) : null}
                              <Text style={styles.foodMeta}>
                                {food.calorias} Kcal / 100{food.unidad_base}
                              </Text>
                            </View>
                            <FontAwesome name="chevron-right" size={14} color={colors.textLight} />
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={styles.emptyResultsBox}>
                        <FontAwesome name="search" size={22} color={colors.textLight} />
                        <Text style={styles.emptyResultsText}>
                          {query.trim()
                            ? 'No encontramos ese alimento. Prueba otra palabra o escanea el código.'
                            : 'Busca un alimento o escanea el código del producto.'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity style={styles.secondaryInlineButton} onPress={openScannerModal}>
                    <FontAwesome name="qrcode" size={18} color={colors.primaryDark} />
                    <Text style={styles.secondaryInlineButtonText}>Escanear código</Text>
                  </TouchableOpacity>
                </>
              )}

              {addFlowStep === 'confirm' && selectedFood && (
                <>
                  <View style={styles.selectedFoodCard}>
                    <Text style={styles.selectedFoodName}>{selectedFood.nombre}</Text>
                    {selectedFoodOrigin ? (
                      <Text style={styles.selectedFoodOrigin}>{selectedFoodOrigin}</Text>
                    ) : null}
                    <Text style={styles.selectedFoodMeta}>
                      Base: {selectedFood.calorias} Kcal / 100{selectedFood.unidad_base}
                    </Text>
                  </View>

                  <View style={styles.quickQuantityRow}>
                    {quickQuantities.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.quickQuantityChip,
                          quantity === item && styles.quickQuantityChipSelected,
                        ]}
                        onPress={() => setQuantity(item)}
                      >
                        <Text
                          style={[
                            styles.quickQuantityText,
                            quantity === item && styles.quickQuantityTextSelected,
                          ]}
                        >
                          {item}{unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <NumberInput
                    label="Cantidad"
                    placeholder="100"
                    value={quantity}
                    onChangeText={setQuantity}
                    unit={unit}
                    keyboardType="decimal-pad"
                  />

                  <View style={styles.unitToggle}>
                    {unitOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.unitToggleItem,
                          unit === option.value && styles.unitToggleItemSelected,
                        ]}
                        onPress={() => setUnit(option.value as 'g' | 'ml')}
                      >
                        <Text
                          style={[
                            styles.unitToggleText,
                            unit === option.value && styles.unitToggleTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.nutritionSummary}>
                    <View style={styles.nutritionSummaryMain}>
                      <Text style={styles.nutritionSummaryLabel}>Energía</Text>
                      <Text style={styles.nutritionSummaryValue}>{calculatedEnergy} Kcal</Text>
                    </View>
                    <View style={styles.nutritionMacroRow}>
                      <Text style={styles.nutritionMacro}>{calculatedProtein}g Prot</Text>
                      <Text style={styles.nutritionMacro}>{calculatedCarbs}g Carb</Text>
                      <Text style={styles.nutritionMacro}>{calculatedFat}g Grasas</Text>
                    </View>
                  </View>

                  {error && <Text style={styles.errorText}>{error}</Text>}

                  <Button
                    title={`Añadir a ${selectedMealType}`}
                    onPress={handleAddEntry}
                    loading={isSaving}
                    size="large"
                    style={styles.modalActionButton}
                  />
                </>
              )}

              {addFlowStep === 'templates' && (
                <>
                  {isLoadingTemplates ? (
                    <View style={styles.templateLoadingBox}>
                      <ActivityIndicator color={colors.primary} />
                    </View>
                  ) : templates.length > 0 ? (
                    <View style={styles.templatePickerContent}>
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
                              {template.items.length} alimentos · {round(template.calorias)} Kcal
                            </Text>
                          </View>
                          <FontAwesome name="chevron-right" size={16} color={colors.textLight} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyTemplatePicker}>
                      <FontAwesome name="folder-open" size={42} color={colors.border} />
                      <Text style={styles.emptyTemplateTitle}>No hay plantillas</Text>
                      <Text style={styles.emptyTemplateText}>
                        Crea una plantilla para añadir comidas completas desde aquí.
                      </Text>
                      <Button
                        title="Crear plantilla"
                        onPress={goToTemplates}
                        size="large"
                        style={styles.modalActionButton}
                      />
                    </View>
                  )}
                  {error && <Text style={styles.errorText}>{error}</Text>}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <FoodScannerModal
        visible={isScannerVisible}
        onClose={closeScannerModal}
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
    backgroundColor: colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  aiButtonTextGroup: {
    flex: 1,
  },
  aiButtonTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  aiButtonSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  aiIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
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
  addModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 18,
  },
  addModalTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  addBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBackButtonPlaceholder: {
    width: 38,
    height: 38,
  },
  addCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTypeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealTypeChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealTypeChipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  mealTypeChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  mealTypeChipTextSelected: {
    color: colors.primaryDark,
  },
  addIntroText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  addMethodCard: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.backgroundCard,
  },
  addMethodCardPrimary: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  addMethodIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMethodIconSecondary: {
    backgroundColor: colors.primaryMuted,
  },
  addMethodTextGroup: {
    flex: 1,
  },
  addMethodTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  addMethodText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  foodResultTextGroup: {
    flex: 1,
  },
  foodResultSelected: {
    backgroundColor: colors.primaryMuted,
  },
  foodName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  foodOrigin: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  foodMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  emptyResultsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
  },
  emptyResultsText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryInlineButton: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  secondaryInlineButtonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  selectedFoodCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectedFoodName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  selectedFoodOrigin: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  selectedFoodMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  quickQuantityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickQuantityChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickQuantityChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  quickQuantityText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  quickQuantityTextSelected: {
    color: colors.primaryDark,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  unitToggleItem: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitToggleItemSelected: {
    backgroundColor: colors.backgroundCard,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  unitToggleText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  unitToggleTextSelected: {
    color: colors.text,
  },
  nutritionSummary: {
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    padding: 14,
    gap: 12,
  },
  nutritionSummaryMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutritionSummaryLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
  },
  nutritionSummaryValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  nutritionMacroRow: {
    flexDirection: 'row',
    gap: 8,
  },
  nutritionMacro: {
    flex: 1,
    color: colors.textSecondary,
    backgroundColor: colors.backgroundCard,
    borderRadius: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '800',
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
