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
import { dailyLogService } from '@/services/dailyLog';
import { templatesService } from '@/services/templates';
import type { Food } from '@/types/dailyLog';
import type { MealTemplate, TemplateItemPayload } from '@/types/templates';

const unitOptions = [
  { value: 'g', label: 'Gramos' },
  { value: 'ml', label: 'Mililitros' },
];

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
  const [isCameraAvailable, setIsCameraAvailable] = useState(false);
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
      if (!isModalVisible) return;
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
  }, [query, isModalVisible]);

  const openCreateModal = () => {
    setSelectedTemplate(null);
    setName('');
    setQuery('');
    setQuantity('');
    setUnit('g');
    setItems([]);
    setSelectedFood(null);
    setFoods([]);
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
  };

  const handleScannedFood = (food: Food) => {
    handleSelectFood(food);
    setFoods([food]);
    setError(null);
  };

  const calculatedEnergy = useMemo(() => {
    if (!selectedFood || !quantity) return 0;
    return round((selectedFood.calorias * Number(quantity)) / 100);
  }, [quantity, selectedFood]);

  const totalCalories = useMemo(
    () => round(items.reduce((total, item) => total + item.calorias, 0)),
    [items],
  );

  const handleAddDraftItem = () => {
    if (!selectedFood) {
      setError('Selecciona un alimento');
      return;
    }
    if (!quantity.trim() || isNaN(Number(quantity)) || Number(quantity) <= 0) {
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
    setError(null);
  };

  const handleRemoveDraftItem = (index: number) => {
    setItems((currentItems) => currentItems.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSaveTemplate = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (items.length === 0) {
      setError('Anade al menos un alimento');
      return;
    }

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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedTemplate ? 'Editar plantilla' : 'Nueva plantilla'}
            </Text>

            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Input
                label="Nombre"
                placeholder="Desayuno habitual"
                value={name}
                onChangeText={setName}
                icon="bookmark"
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
                <Text style={styles.energyLabel}>Energia seleccionada</Text>
                <Text style={styles.energyValue}>{calculatedEnergy} Kcal</Text>
              </View>

              <Button title="Anadir alimento" onPress={handleAddDraftItem} variant="outline" />

              {isCameraAvailable && (
                <TouchableOpacity
                  style={styles.qrButton}
                  onPress={() => setIsScannerVisible(true)}
                >
                  <Text style={styles.qrButtonText}>Escanear QR</Text>
                  <FontAwesome name="qrcode" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              )}

              <View style={styles.draftBox}>
                <View style={styles.draftHeader}>
                  <Text style={styles.draftTitle}>Alimentos</Text>
                  <Text style={styles.draftCalories}>{totalCalories} Kcal</Text>
                </View>
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <View key={`${item.alimento_id}-${index}`} style={styles.draftItem}>
                      <View style={styles.draftItemTextGroup}>
                        <Text style={styles.draftItemName}>{item.alimento_nombre}</Text>
                        <Text style={styles.draftItemMeta}>
                          {item.cantidad} {item.unidad} - {round(item.calorias)} Kcal
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
                  <Text style={styles.emptyDraftText}>Sin alimentos anadidos</Text>
                )}
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Button
                title="Guardar"
                onPress={handleSaveTemplate}
                loading={isSaving}
                size="large"
                style={styles.modalActionButton}
              />
              <Button
                title="Cancelar"
                onPress={closeModal}
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
