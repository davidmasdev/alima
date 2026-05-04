import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import Svg, { Circle, Line, Path, Polyline, Text as SvgText } from 'react-native-svg';
import { AnimatedModalContent } from '@/components/animated/AnimatedModalContent';
import { Button } from '@/components/ui/Button';
import { NumberInput } from '@/components/ui/NumberInput';
import type { AppColors } from '@/constants/Colors';
import { useAppTheme } from '@/contexts/ThemeContext';
import { ApiError } from '@/services/api';
import { progressService } from '@/services/progress';
import type { ProgressDay, ProgressRange, ProgressResponse, WeightPoint } from '@/types/progress';

const ranges: { value: ProgressRange; label: string }[] = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'total', label: 'Total' },
];

const chartWidth = 320;
const chartHeight = 210;
const chartPadding = 28;
const weekDayLabels = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

function buildLinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function buildAreaPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  const bottom = chartHeight - chartPadding;
  return `${buildLinePath(points)} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`;
}

function buildPoints(values: number[]): { x: number; y: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = max - min || 1;
  const width = chartWidth - chartPadding * 2;
  const height = chartHeight - chartPadding * 2;

  return values.map((value, index) => ({
    x: chartPadding + (values.length === 1 ? width / 2 : (width * index) / (values.length - 1)),
    y: chartPadding + height - ((value - min) / span) * height,
  }));
}

function ProgressChart({
  calories,
  weights,
  goal,
}: {
  calories: ProgressDay[];
  weights: WeightPoint[];
  goal: number | null;
}) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const calorieValues = calories.map((day) => day.calorias);
  const caloriePoints = buildPoints(calorieValues);
  const weightPoints = buildPoints(weights.map((item) => item.peso));
  const labelPoints = calories.length > 0
    ? calories.map((item) => item.fecha)
    : weights.map((item) => item.fecha);
  const goalY = goal && calorieValues.length > 0
    ? buildPoints([...calorieValues, goal]).at(-1)?.y
    : null;

  if (calories.length === 0 && weights.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <FontAwesome name="area-chart" size={42} color={colors.border} />
        <Text style={styles.chartEmptyText}>Registra comidas o peso para ver tu grafico</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartFrame}>
      <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        <Line
          x1={chartPadding}
          y1={chartHeight - chartPadding}
          x2={chartWidth - chartPadding}
          y2={chartHeight - chartPadding}
          stroke={colors.border}
          strokeWidth="1"
        />
        <Line
          x1={chartPadding}
          y1={chartPadding}
          x2={chartPadding}
          y2={chartHeight - chartPadding}
          stroke={colors.border}
          strokeWidth="1"
        />
        {goalY && (
          <Line
            x1={chartPadding}
            y1={goalY}
            x2={chartWidth - chartPadding}
            y2={goalY}
            stroke={colors.primaryLight}
            strokeDasharray="5 5"
            strokeWidth="1.5"
          />
        )}
        {caloriePoints.length > 0 && (
          <>
            <Path d={buildAreaPath(caloriePoints)} fill="rgba(45, 212, 191, 0.18)" />
            <Path
              d={buildLinePath(caloriePoints)}
              fill="none"
              stroke={colors.primaryDark}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        {weightPoints.length >= 2 && (
          <Polyline
            points={weightPoints.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={colors.secondary}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {weightPoints.map((point, index) => (
          <Circle
            key={`weight-${point.x}-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={colors.backgroundCard}
            stroke={colors.secondary}
            strokeWidth="2"
          />
        ))}
        {caloriePoints.map((point, index) => (
          <Circle
            key={`${point.x}-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={colors.backgroundCard}
            stroke={colors.primaryDark}
            strokeWidth="2"
          />
        ))}
        <SvgText x={chartPadding} y={chartHeight - 6} fill={colors.textLight} fontSize="10">
          {labelPoints[0] ? formatShortDate(labelPoints[0]) : ''}
        </SvgText>
        <SvgText
          x={chartWidth - chartPadding - 28}
          y={chartHeight - 6}
          fill={colors.textLight}
          fontSize="10"
        >
          {labelPoints.at(-1) ? formatShortDate(labelPoints[labelPoints.length - 1]) : ''}
        </SvgText>
      </Svg>
      <View style={styles.legendRow}>
        {calories.length > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.calorieDot]} />
            <Text style={styles.legendText}>Calorias</Text>
          </View>
        )}
        {weights.length > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.weightDot]} />
            <Text style={styles.legendText}>Peso</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function getDayColor(day: ProgressDay, colors: AppColors): string {
  if (!day.registrado) return colors.border;
  return day.cumplido ? colors.success : colors.error;
}

export default function ProgressScreen() {
  const { colors, effectiveTheme } = useAppTheme();
  const styles = createStyles(colors);
  const [selectedRange, setSelectedRange] = useState<ProgressRange>('week');
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWeightModalVisible, setIsWeightModalVisible] = useState(false);
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [weight, setWeight] = useState('');
  const [weightError, setWeightError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const anchorDate = useMemo(() => formatDate(new Date()), []);

  const loadProgress = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await progressService.getProgress(selectedRange, anchorDate);
      setProgress(data);
    } catch {
      setError('No se pudo cargar el progreso');
    } finally {
      setIsLoading(false);
    }
  }, [anchorDate, selectedRange]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const days = progress?.days ?? [];
  const hasHistory =
    (progress?.summary.dias_registrados ?? 0) > 0 || (progress?.weight_series.length ?? 0) > 0;
  const completionRate = progress?.summary.dias_registrados
    ? Math.round((progress.summary.dias_cumplidos / progress.summary.dias_registrados) * 100)
    : 0;
  const latestWeight = progress?.weight_series.at(-1) ?? null;

  const openWeightModal = () => {
    setWeight(latestWeight ? String(latestWeight.peso) : '');
    setWeightError(null);
    setIsWeightModalVisible(true);
  };

  const closeWeightModal = () => {
    if (!isSavingWeight) {
      setIsWeightModalVisible(false);
    }
  };

  const handleSaveWeight = async () => {
    if (!weight.trim() || isNaN(Number(weight)) || Number(weight) <= 0) {
      setWeightError('Ingresa un peso valido');
      return;
    }

    setIsSavingWeight(true);
    setWeightError(null);
    try {
      const updatedProgress = await progressService.saveWeight(
        { peso: Number(weight) },
        selectedRange,
        anchorDate,
      );
      setProgress(updatedProgress);
      setIsWeightModalVisible(false);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setWeightError(caughtError.detail);
      } else {
        setWeightError('No se pudo guardar el peso');
      }
    } finally {
      setIsSavingWeight(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={effectiveTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={styles.headerBackground} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Progreso</Text>
          <Text style={styles.subtitle}>Historial de dieta y peso</Text>
        </View>

        <View style={styles.segmentedControl}>
          {ranges.map((range) => (
            <TouchableOpacity
              key={range.value}
              style={[
                styles.segmentButton,
                selectedRange === range.value && styles.segmentButtonActive,
              ]}
              onPress={() => setSelectedRange(range.value)}
              accessibilityRole="button"
              accessibilityLabel={`Ver ${range.label}`}
            >
              <Text
                style={[
                  styles.segmentText,
                  selectedRange === range.value && styles.segmentTextActive,
                ]}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.weightActionCard}>
          <View style={styles.weightTextGroup}>
            <Text style={styles.weightTitle}>Peso actual</Text>
            <Text style={styles.weightSubtitle}>
              {latestWeight
                ? `${latestWeight.peso} kg - ${formatShortDate(latestWeight.fecha)}`
                : 'Sin registros de peso'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.weightButton}
            onPress={openWeightModal}
            accessibilityRole="button"
            accessibilityLabel="Actualizar peso"
          >
            <FontAwesome name="plus" size={16} color={colors.textWhite} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            {error && <Text style={styles.errorText}>{error}</Text>}

            {!hasHistory ? (
              <View style={styles.emptyState}>
                <FontAwesome name="calendar-check-o" size={54} color={colors.border} />
                <Text style={styles.emptyTitle}>Empieza tu historial</Text>
                <Text style={styles.emptyText}>
                  Registra comidas en la vista diaria para ver tu progreso.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.chartCard}>
                  <View style={styles.chartHeader}>
                    <View>
                      <Text style={styles.cardTitle}>Grafico de progreso</Text>
                      <Text style={styles.cardSubtitle}>
                        {progress?.weight_series.length && progress.weight_series.length >= 2
                          ? 'Calorias y peso'
                          : 'Calorias consumidas'}
                      </Text>
                    </View>
                    <View style={styles.completionPill}>
                      <Text style={styles.completionText}>{completionRate}%</Text>
                    </View>
                  </View>
                  <ProgressChart
                    calories={progress?.calories_series ?? []}
                    weights={progress?.weight_series ?? []}
                    goal={progress?.objetivo_calorias ?? null}
                  />
                </View>

                <View style={styles.summaryGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{progress?.summary.dias_registrados ?? 0}</Text>
                    <Text style={styles.statLabel}>dias</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{progress?.summary.dias_cumplidos ?? 0}</Text>
                    <Text style={styles.statLabel}>cumplidos</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>
                      {Math.round(progress?.summary.calorias_promedio ?? 0)}
                    </Text>
                    <Text style={styles.statLabel}>kcal media</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{progress?.summary.racha_actual ?? 0}</Text>
                    <Text style={styles.statLabel}>racha</Text>
                  </View>
                </View>

                <View style={styles.calendarCard}>
                  <Text style={styles.cardTitle}>Calendario</Text>
                  <View style={styles.calendarGrid}>
                    {days.map((day) => {
                      const date = new Date(`${day.fecha}T00:00:00`);
                      return (
                        <View key={day.fecha} style={styles.dayCell}>
                          <Text style={styles.dayName}>{weekDayLabels[date.getDay()]}</Text>
                          <View style={[styles.dayBubble, { borderColor: getDayColor(day, colors) }]}>
                            <Text style={styles.dayNumber}>{date.getDate()}</Text>
                            <View
                              style={[
                                styles.statusDot,
                                { backgroundColor: getDayColor(day, colors) },
                              ]}
                            />
                          </View>
                          <Text style={styles.dayCalories}>
                            {day.registrado ? `${Math.round(day.calorias)}` : '-'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={isWeightModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeWeightModal}
      >
        <View style={styles.modalOverlay}>
          <AnimatedModalContent style={styles.weightModalContent} visible={isWeightModalVisible}>
            <Text style={styles.modalTitle}>Actualizar peso</Text>
            <Text style={styles.modalText}>Registra tu peso de hoy para ver la evolucion.</Text>

            <NumberInput
              label="Peso"
              placeholder="0"
              value={weight}
              onChangeText={(text) => {
                setWeight(text);
                if (weightError) setWeightError(null);
              }}
              unit="kg"
              keyboardType="decimal-pad"
              error={weightError ?? undefined}
            />

            <Button
              title="Guardar"
              onPress={handleSaveWeight}
              loading={isSavingWeight}
              size="large"
              style={styles.modalButton}
            />
            <Button
              title="Cancelar"
              onPress={closeWeightModal}
              variant="secondary"
              size="large"
              style={styles.modalButton}
            />
          </AnimatedModalContent>
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
    marginBottom: 24,
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
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  weightActionCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  weightTextGroup: {
    flex: 1,
  },
  weightTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  weightSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  weightButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: colors.textWhite,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  weightModalContent: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    gap: 16,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalButton: {
    width: '100%',
  },
  emptyState: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 20,
    padding: 34,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  completionPill: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  completionText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  chartFrame: {
    alignItems: 'center',
  },
  chartEmpty: {
    height: chartHeight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
  },
  chartEmptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 18,
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  calorieDot: {
    backgroundColor: colors.primaryDark,
  },
  weightDot: {
    backgroundColor: colors.secondary,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  statBox: {
    width: '48%',
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  calendarCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 20,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  dayCell: {
    width: 46,
    alignItems: 'center',
    gap: 5,
  },
  dayName: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  dayBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  statusDot: {
    position: 'absolute',
    bottom: 3,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dayCalories: {
    color: colors.textLight,
    fontSize: 10,
    fontWeight: '700',
  },
});
