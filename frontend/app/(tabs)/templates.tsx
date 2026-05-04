import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { AnimatedModalContent } from '@/components/animated/AnimatedModalContent';
import { FadeSlideView } from '@/components/animated/FadeSlideView';
import { FoodScannerModal } from '@/components/FoodScannerModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumberInput } from '@/components/ui/NumberInput';
import type { AppColors } from '@/constants/Colors';
import { useAppTheme } from '@/contexts/ThemeContext';
import { ApiError } from '@/services/api';
import { dailyLogService } from '@/services/dailyLog';
import { errorFeedback, mediumImpact, successFeedback } from '@/services/haptics';
import { templatesService } from '@/services/templates';
import type { Food } from '@/types/dailyLog';
import type { MealTemplate, TemplateItemPayload } from '@/types/templates';

const unitOptions = [
  { value: 'g', label: 'Gramos' },
  { value: 'ml', label: 'Mililitros' },
];

type TemplateFlowStep = 'details' | 'choose' | 'search' | 'confirm' | 'review';

const quickQuantities = ['50', '100', '150', '200'];

interface DraftItem extends TemplateItemPayload {
  alimento_nombre: string;
  calorias: number;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export default function TemplatesScreen() {
  const { colors, effectiveTheme } = useAppTheme();
  const styles = createStyles(colors);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MealTemplate | null>(null);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'g' | 'ml'>('g');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [templateFlowStep, setTemplateFlowStep] = useState<TemplateFlowStep>('details');
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await templatesService.listTemplates('name');
      setTemplates(data);
    } catch {
      setError('No se pudieron cargar las plantillas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    let isActive = true;
    const timer = setTimeout(async () => {
      if (!isModalVisible || templateFlowStep !== 'search') return;
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
  }, [query, isModalVisible, templateFlowStep]);

  const openCreateModal = () => {
    setSelectedTemplate(null);
    setName('');
    setQuery('');
    setQuantity('');
    setUnit('g');
    setItems([]);
    setSelectedFood(null);
    setFoods([]);
    setTemplateFlowStep('details');
    setError(null);
    setIsModalVisible(true);
  };

  const openEditModal = (template: MealTemplate) => {
    setSelectedTemplate(template);
    setName(template.nombre);
    setQuery('');
    setQuantity('');
    setUnit('g');
    setSelectedFood(null);
    setFoods([]);
    setItems(
      template.items.map((item) => ({
        alimento_id: item.alimento_id,
        alimento_nombre: item.alimento_nombre,
        cantidad: item.cantidad,
        unidad: item.unidad,
        calorias: item.calorias,
      })),
    );
    setTemplateFlowStep('review');
    setError(null);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setQuery(food.nombre);
    setUnit(food.unidad_base);
    setQuantity('100');
    setTemplateFlowStep('confirm');
    setError(null);
  };

  const handleScannedFood = (food: Food) => {
    handleSelectFood(food);
    setFoods([food]);
    setError(null);
    setIsScannerVisible(false);
    setIsModalVisible(true);
  };

  const calculatedEnergy = useMemo(() => {
    if (!selectedFood || !quantity) return 0;
    return round((selectedFood.calorias * Number(quantity)) / 100);
  }, [quantity, selectedFood]);
  const calculatedProtein = useMemo(() => {
    if (!selectedFood || !quantity) return 0;
    return round((selectedFood.proteinas * Number(quantity)) / 100);
  }, [quantity, selectedFood]);
  const calculatedCarbs = useMemo(() => {
    if (!selectedFood || !quantity) return 0;
    return round((selectedFood.carbohidratos * Number(quantity)) / 100);
  }, [quantity, selectedFood]);
  const calculatedFat = useMemo(() => {
    if (!selectedFood || !quantity) return 0;
    return round((selectedFood.grasas * Number(quantity)) / 100);
  }, [quantity, selectedFood]);

  const totalCalories = useMemo(
    () => round(items.reduce((total, item) => total + item.calorias, 0)),
    [items],
  );
  const selectedFoodOrigin = [selectedFood?.marca, selectedFood?.supermercado]
    .filter(Boolean)
    .join(' · ');
  const modalTitle = selectedTemplate ? 'Editar plantilla' : 'Nueva plantilla';

  const handleAddDraftItem = () => {
    if (!selectedFood) {
      errorFeedback();
      setError('Selecciona un alimento');
      return;
    }
    if (!quantity.trim() || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      errorFeedback();
      setError('Ingresa una cantidad valida');
      return;
    }

    setItems((currentItems) => [
      ...currentItems,
      {
        alimento_id: selectedFood.id,
        alimento_nombre: selectedFood.nombre,
        cantidad: Number(quantity),
        unidad: unit,
        calorias: calculatedEnergy,
      },
    ]);
    setSelectedFood(null);
    setQuery('');
    setQuantity('');
    setFoods([]);
    setTemplateFlowStep('choose');
    setError(null);
    successFeedback();
  };

  const handleRemoveDraftItem = (index: number) => {
    setItems((currentItems) => currentItems.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleContinueFromDetails = () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setError(null);
    setTemplateFlowStep(items.length > 0 ? 'review' : 'choose');
  };

  const openSearchStep = () => {
    setTemplateFlowStep('search');
    setError(null);
  };

  const openScanner = () => {
    setIsModalVisible(false);
    setTimeout(() => setIsScannerVisible(true), 250);
  };

  const closeScanner = () => {
    setIsScannerVisible(false);
    setIsModalVisible(true);
    if (!selectedFood) {
      setTemplateFlowStep('choose');
    }
  };

  const goBackInFlow = () => {
    setError(null);
    if (templateFlowStep === 'details') {
      closeModal();
    } else if (templateFlowStep === 'choose') {
      setTemplateFlowStep('details');
    } else if (templateFlowStep === 'review') {
      setTemplateFlowStep('choose');
    } else {
      setTemplateFlowStep('choose');
      setSelectedFood(null);
    }
  };

  const handleSaveTemplate = async () => {
    if (!name.trim()) {
      errorFeedback();
      setError('El nombre es obligatorio');
      return;
    }
    if (items.length === 0) {
      errorFeedback();
      setError('Anade al menos un alimento');
      return;
    }

    mediumImpact();
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        nombre: name.trim(),
        items: items.map(({ alimento_id, cantidad, unidad }) => ({
          alimento_id,
          cantidad,
          unidad,
        })),
      };
      if (selectedTemplate) {
        await templatesService.updateTemplate(selectedTemplate.id, payload);
      } else {
        await templatesService.createTemplate(payload);
      }
      setIsModalVisible(false);
      successFeedback();
      await loadTemplates();
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.detail);
      } else {
        setError('No se pudo guardar la plantilla');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = (template: MealTemplate) => {
    Alert.alert(
      'Eliminar plantilla',
      `Seguro que quieres eliminar "${template.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await templatesService.deleteTemplate(template.id);
              successFeedback();
              await loadTemplates();
            } catch {
              setError('No se pudo eliminar la plantilla');
            }
          },
        },
      ],
    );
  };

  const renderTemplate = (template: MealTemplate) => (
    <View key={template.id} style={styles.templateCard}>
      <View style={styles.templateHeader}>
        <View style={styles.templateTitleGroup}>
          <Text style={styles.templateName}>{template.nombre}</Text>
          <Text style={styles.templateMeta}>
            {template.items.length} alimentos - {round(template.calorias)} Kcal
          </Text>
        </View>
        <View style={styles.templateActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => openEditModal(template)}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${template.nombre}`}
          >
            <FontAwesome name="pencil" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleDeleteTemplate(template)}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar ${template.nombre}`}
          >
            <FontAwesome name="trash" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.itemsPreview}>
        {template.items.slice(0, 3).map((item) => (
          <Text key={item.id} style={styles.itemPreviewText}>
            {item.alimento_nombre} - {item.cantidad} {item.unidad}
          </Text>
        ))}
        {template.items.length > 3 && (
          <Text style={styles.itemPreviewText}>+{template.items.length - 3} mas</Text>
        )}
      </View>
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
          <View>
            <Text style={styles.title}>Plantillas</Text>
            <Text style={styles.subtitle}>Comidas guardadas para reutilizar</Text>
          </View>
          <TouchableOpacity
            style={styles.addTemplateButton}
            onPress={openCreateModal}
            accessibilityRole="button"
            accessibilityLabel="Nueva plantilla"
          >
            <FontAwesome name="plus" size={18} color={colors.textWhite} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            {error && <Text style={styles.errorText}>{error}</Text>}

            {templates.length > 0 ? (
              <View style={styles.templateList}>{templates.map(renderTemplate)}</View>
            ) : (
              <View style={styles.emptyState}>
                <FontAwesome name="folder-open" size={64} color={colors.border} />
                <Text style={styles.emptyStateTitle}>No hay plantillas</Text>
                <Text style={styles.emptyStateText}>
                  Crea una plantilla para anadir comidas completas desde Hoy
                </Text>
                <Button
                  title="Nueva plantilla"
                  onPress={openCreateModal}
                  style={styles.emptyButton}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <AnimatedModalContent style={styles.modalContent} visible={isModalVisible}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalIconButton}
                onPress={goBackInFlow}
                accessibilityRole="button"
                accessibilityLabel={templateFlowStep === 'details' ? 'Cerrar' : 'Volver'}
              >
                <FontAwesome
                  name={templateFlowStep === 'details' ? 'times' : 'arrow-left'}
                  size={16}
                  color={colors.text}
                />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <TouchableOpacity
                style={styles.modalIconButton}
                onPress={closeModal}
                accessibilityRole="button"
                accessibilityLabel="Cerrar plantilla"
              >
                <FontAwesome name="times" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <FadeSlideView
                triggerKey={templateFlowStep}
                axis="x"
                style={styles.stepContent}
              >
              {templateFlowStep === 'details' && (
                <>
                  <Text style={styles.stepText}>Ponle un nombre reconocible a la plantilla.</Text>
                  <Input
                    label="Nombre"
                    placeholder="Desayuno habitual"
                    value={name}
                    onChangeText={setName}
                    icon="bookmark"
                  />
                  {error && <Text style={styles.errorText}>{error}</Text>}
                  <Button
                    title={items.length > 0 ? 'Continuar' : 'Añadir alimentos'}
                    onPress={handleContinueFromDetails}
                    size="large"
                    style={styles.modalActionButton}
                  />
                </>
              )}

              {templateFlowStep === 'choose' && (
                <>
                  <View style={styles.templateSummaryCard}>
                    <Text style={styles.templateSummaryName}>{name.trim() || 'Nueva plantilla'}</Text>
                    <Text style={styles.templateSummaryMeta}>
                      {items.length} alimentos · {totalCalories} Kcal
                    </Text>
                  </View>
                  <Text style={styles.stepText}>Elige cómo añadir alimentos a esta plantilla.</Text>

                  <TouchableOpacity
                    style={[styles.methodCard, styles.methodCardPrimary]}
                    onPress={openSearchStep}
                    accessibilityRole="button"
                    accessibilityLabel="Buscar alimento"
                  >
                    <View style={styles.methodIcon}>
                      <FontAwesome name="search" size={20} color={colors.textWhite} />
                    </View>
                    <View style={styles.methodTextGroup}>
                      <Text style={styles.methodTitle}>Buscar alimento</Text>
                      <Text style={styles.methodText}>Añade alimentos desde la base de datos.</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={16} color={colors.textLight} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.methodCard}
                    onPress={openScanner}
                    accessibilityRole="button"
                    accessibilityLabel="Escanear código"
                  >
                    <View style={[styles.methodIcon, styles.methodIconSecondary]}>
                      <FontAwesome name="qrcode" size={20} color={colors.primaryDark} />
                    </View>
                    <View style={styles.methodTextGroup}>
                      <Text style={styles.methodTitle}>Escanear código</Text>
                      <Text style={styles.methodText}>Usa el código del producto.</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={16} color={colors.textLight} />
                  </TouchableOpacity>

                  {items.length > 0 && (
                    <Button
                      title="Revisar y guardar"
                      onPress={() => setTemplateFlowStep('review')}
                      variant="outline"
                      size="large"
                      style={styles.modalActionButton}
                    />
                  )}
                </>
              )}

              {templateFlowStep === 'search' && (
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
                              {foodOrigin ? <Text style={styles.foodOrigin}>{foodOrigin}</Text> : null}
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

                  <TouchableOpacity style={styles.secondaryInlineButton} onPress={openScanner}>
                    <FontAwesome name="qrcode" size={18} color={colors.primaryDark} />
                    <Text style={styles.secondaryInlineButtonText}>Escanear código</Text>
                  </TouchableOpacity>
                </>
              )}

              {templateFlowStep === 'confirm' && selectedFood && (
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
                    title="Añadir a plantilla"
                    onPress={handleAddDraftItem}
                    size="large"
                    style={styles.modalActionButton}
                  />
                </>
              )}

              {templateFlowStep === 'review' && (
                <>
                  <View style={styles.templateSummaryCard}>
                    <Text style={styles.templateSummaryName}>{name.trim() || 'Nueva plantilla'}</Text>
                    <Text style={styles.templateSummaryMeta}>
                      {items.length} alimentos · {totalCalories} Kcal
                    </Text>
                  </View>

                  <View style={styles.draftBox}>
                    <View style={styles.draftHeader}>
                      <Text style={styles.draftTitle}>Alimentos</Text>
                      <TouchableOpacity
                        onPress={() => setTemplateFlowStep('choose')}
                        accessibilityRole="button"
                        accessibilityLabel="Añadir otro alimento"
                      >
                        <Text style={styles.addAnotherText}>Añadir otro</Text>
                      </TouchableOpacity>
                    </View>
                    {items.length > 0 ? (
                      items.map((item, index) => (
                        <View key={`${item.alimento_id}-${index}`} style={styles.draftItem}>
                          <View style={styles.draftItemTextGroup}>
                            <Text style={styles.draftItemName}>{item.alimento_nombre}</Text>
                            <Text style={styles.draftItemMeta}>
                              {item.cantidad} {item.unidad} · {round(item.calorias)} Kcal
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.removeItemButton}
                            onPress={() => handleRemoveDraftItem(index)}
                            accessibilityRole="button"
                            accessibilityLabel={`Quitar ${item.alimento_nombre}`}
                          >
                            <FontAwesome name="times" size={14} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyDraftText}>Sin alimentos añadidos</Text>
                    )}
                  </View>

                  {error && <Text style={styles.errorText}>{error}</Text>}

                  <Button
                    title="Guardar plantilla"
                    onPress={handleSaveTemplate}
                    loading={isSaving}
                    size="large"
                    style={styles.modalActionButton}
                  />
                </>
              )}
              </FadeSlideView>
            </ScrollView>
          </AnimatedModalContent>
        </View>
      </Modal>

      <FoodScannerModal
        visible={isScannerVisible}
        onClose={closeScanner}
        onFoodScanned={handleScannedFood}
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  addTemplateButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
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
  templateList: {
    gap: 14,
  },
  templateCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  templateTitleGroup: {
    flex: 1,
  },
  templateName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  templateMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsPreview: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 14,
    paddingTop: 12,
    gap: 6,
  },
  itemPreviewText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyButton: {
    marginTop: 22,
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
  modalTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 18,
  },
  modalIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    gap: 16,
    paddingBottom: 4,
  },
  stepContent: {
    gap: 16,
  },
  stepText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  templateSummaryCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  templateSummaryName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  templateSummaryMeta: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  methodCard: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.backgroundCard,
  },
  methodCardPrimary: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconSecondary: {
    backgroundColor: colors.primaryMuted,
  },
  methodTextGroup: {
    flex: 1,
  },
  methodTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  methodText: {
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
  emptyResultsText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyResultsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
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
  draftBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  draftTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  draftCalories: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  addAnotherText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  draftItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
    gap: 12,
  },
  draftItemTextGroup: {
    flex: 1,
  },
  draftItemName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  draftItemMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  removeItemButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
  },
  emptyDraftText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 14,
  },
  modalActionButton: {
    width: '100%',
  },
});
