import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BarcodeScanningResult,
  BarcodeType,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import { FontAwesome } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { ApiError } from '@/services/api';
import { dailyLogService } from '@/services/dailyLog';
import type { Food } from '@/types/dailyLog';

const barcodeTypes: BarcodeType[] = ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128'];

interface FoodScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onFoodScanned: (food: Food) => void;
}

export function FoodScannerModal({
  visible,
  onClose,
  onFoodScanned,
}: FoodScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setError(null);
      setLastCode(null);
      setIsResolving(false);
    }
  }, [visible]);

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (isResolving || result.data === lastCode) return;

    setIsResolving(true);
    setLastCode(result.data);
    setError(null);
    try {
      const food = await dailyLogService.scanFood(result.data);
      onFoodScanned(food);
      onClose();
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.detail);
      } else {
        setError('No se pudo reconocer el alimento');
      }
    } finally {
      setIsResolving(false);
    }
  };

  const canUseCamera = permission?.granted;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Escanear QR</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Cerrar escáner"
            >
              <FontAwesome name="times" size={18} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {!permission ? (
            <View style={styles.messageBox}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : !canUseCamera ? (
            <View style={styles.messageBox}>
              <FontAwesome name="camera" size={34} color={Colors.textSecondary} />
              <Text style={styles.messageText}>
                Necesitamos acceso a la cámara para escanear códigos.
              </Text>
              <Button title="Permitir cámara" onPress={requestPermission} />
            </View>
          ) : (
            <View style={styles.cameraBox}>
              <CameraView
                style={styles.camera}
                facing="back"
                active={visible && !isResolving}
                barcodeScannerSettings={{ barcodeTypes }}
                onBarcodeScanned={isResolving ? undefined : handleBarcodeScanned}
              />
              <View style={styles.scanFrame} pointerEvents="none" />
              <View style={styles.hintBar}>
                <Text style={styles.hintText}>Enfoca el código del producto</Text>
              </View>
            </View>
          )}

          {isResolving && (
            <View style={styles.statusRow}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.statusText}>Buscando alimento...</Text>
            </View>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}

          <Button
            title="Buscar manualmente"
            onPress={onClose}
            variant="secondary"
            size="large"
            style={styles.actionButton}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlayDark,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
    padding: 18,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBox: {
    height: 340,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.text,
  },
  camera: {
    flex: 1,
  },
  scanFrame: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    top: '26%',
    bottom: '26%',
    borderWidth: 3,
    borderColor: Colors.primary,
    borderRadius: 18,
  },
  hintBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  hintText: {
    color: Colors.textWhite,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  messageBox: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  messageText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  statusText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionButton: {
    width: '100%',
  },
});
