import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { X, Zap, QrCode, Sparkles } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { parseGmRemoteQr, ParsedGmRemoteQr } from '../../utils/qrParser';

const { width, height } = Dimensions.get('window');
const SCAN_TARGET_SIZE = Math.min(width * 0.72, 280);

interface GmQrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (result: ParsedGmRemoteQr) => void;
}

export const GmQrScannerModal: React.FC<GmQrScannerModalProps> = ({
  visible,
  onClose,
  onScan,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [isScanningLocked, setIsScanningLocked] = useState<boolean>(false);

  useEffect(() => {
    if (!visible) {
      setIsScanningLocked(false);
      setTorchEnabled(false);
    }
  }, [visible]);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (isScanningLocked || !result?.data) return;

    setIsScanningLocked(true);
    const parsed = parseGmRemoteQr(result.data);

    if (parsed) {
      onScan(parsed);
      onClose();
    } else {
      Alert.alert(
        'QR Code Non Valido',
        'Il codice QR inquadrato non corrisponde al Telecomando GM di Barber & Dragons.\n\nAssicurati di inquadrare il QR generato dal tasto "Telecomando" sul GM Screen del PC.',
        [
          {
            text: 'Riprova',
            onPress: () => setIsScanningLocked(false),
          },
        ]
      );
    }
  };

  const resetAndClose = () => {
    setIsScanningLocked(false);
    setTorchEnabled(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={resetAndClose}
    >
      <View style={styles.container}>
        {/* Permission Request View */}
        {!permission?.granted ? (
          <SafeAreaView style={styles.permissionContainer}>
            <View style={styles.permissionCard}>
              <View style={styles.iconCircle}>
                <QrCode size={36} color={colors.brassLight} />
              </View>

              <Text style={styles.permissionTitle}>ACCESSO FOTOCAMERA</Text>
              <Text style={styles.permissionText}>
                Per collegare Regia, Iniziativa e Audio allo stesso GM Screen, inquadra il QR
                mostrato sul PC. È necessario autorizzare l&apos;uso della fotocamera.
              </Text>

              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestPermission}
                activeOpacity={0.85}
              >
                <QrCode size={18} color={colors.void} />
                <Text style={styles.permissionButtonText}>Consenti Accesso Fotocamera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={resetAndClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Annulla e Torna Indietro</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        ) : (
          /* Active Camera Scanner View */
          <View style={StyleSheet.absoluteFill}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torchEnabled}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={isScanningLocked ? undefined : handleBarcodeScanned}
            />

            {/* Dark Mask Overlay with Viewfinder Cutout */}
            <SafeAreaView style={styles.overlay}>
              {/* Top Controls Bar */}
              <View style={styles.topBar}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={resetAndClose}
                  activeOpacity={0.8}
                >
                  <X size={20} color={colors.parchmentLight} />
                </TouchableOpacity>

                <View style={styles.topTitleBox}>
                  <Sparkles size={14} color={colors.brassLight} />
                  <Text style={styles.topTitle}>SCANSIONA QR GM</Text>
                </View>

                <TouchableOpacity
                  style={[styles.iconButton, torchEnabled && styles.torchActive]}
                  onPress={() => setTorchEnabled((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <Zap size={20} color={torchEnabled ? colors.void : colors.parchmentLight} />
                </TouchableOpacity>
              </View>

              {/* Center Target Box */}
              <View style={styles.centerContainer}>
                <View style={styles.targetFrame}>
                  {/* Decorative Fantasy Brass Corners */}
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />

                  {isScanningLocked && (
                    <View style={styles.lockingFeedback}>
                      <ActivityIndicator size="large" color={colors.brassLight} />
                      <Text style={styles.lockingText}>Collegamento in corso...</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.instructionText}>
                  Inquadra il QR Code mostrato sul PC{'\n'}
                  <Text style={styles.instructionSub}>
                    (Pulsante &quot;Telecomando&quot; sul GM Screen)
                  </Text>
                </Text>
              </View>

              {/* Bottom Actions */}
              <View style={styles.bottomBar}>
                <TouchableOpacity
                  style={styles.manualEntryBtn}
                  onPress={resetAndClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.manualEntryText}>Inserisci Codice Manualmente</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.void,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.stone,
    borderWidth: 2,
    borderColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 13,
    color: colors.parchmentMuted,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
  },
  permissionButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.void,
    letterSpacing: 0.5,
  },
  cancelButton: {
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontSize: 12,
    color: colors.parchmentMuted,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  topTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(20, 18, 16, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.brassDark,
  },
  topTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20, 18, 16, 0.88)',
    borderWidth: 1,
    borderColor: colors.brassDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  targetFrame: {
    width: SCAN_TARGET_SIZE,
    height: SCAN_TARGET_SIZE,
    borderWidth: 1.5,
    borderColor: 'rgba(200, 157, 73, 0.4)',
    borderRadius: 14,
    backgroundColor: 'transparent',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.brassLight,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 14,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 14,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 14,
  },
  lockingFeedback: {
    backgroundColor: 'rgba(11, 9, 8, 0.9)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  lockingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  instructionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.parchmentLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  instructionSub: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.brassLight,
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: 28,
  },
  manualEntryBtn: {
    backgroundColor: 'rgba(20, 18, 16, 0.92)',
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  manualEntryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
});
