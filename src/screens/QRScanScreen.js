import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const GOLD = '#b89a5a';
const DARK = '#1a1a1a';
const GRAY = '#2a2a2a';

export default function QRScanScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const getCameraPermission = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermission();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || processing) return;

    setScanned(true);
    setProcessing(true);

    try {
      let qrCode = data;

      if (data.includes('/checkin/')) {
        const parts = data.split('/checkin/');
        qrCode = parts[parts.length - 1];
      }

      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles!appointments_patient_id_fkey(full_name),
          appointment_types(name)
        `)
        .eq('qr_code', qrCode)
        .single();

      if (fetchError || !appointment) {
        Alert.alert('Error', 'Cita no encontrada. Verifica el código QR.', [
          { text: 'Escanear de nuevo', onPress: () => setScanned(false) },
        ]);
        return;
      }

      if (appointment.status === 'completed') {
        Alert.alert('Info', 'Esta cita ya fue completada.', [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
        return;
      }

      if (appointment.status === 'cancelled') {
        Alert.alert('Info', 'Esta cita fue cancelada.', [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
        return;
      }

      Alert.alert(
        'Confirmar Check-in',
        `¿Deseas hacer check-in para tu cita?\n\nTipo: ${appointment.appointment_types?.name || 'Cita'}\nFecha: ${new Date(appointment.scheduled_at).toLocaleString('es-MX')}`,
        [
          { text: 'Cancelar', onPress: () => setScanned(false), style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: async () => {
              const { error: updateError } = await supabase
                .from('appointments')
                .update({
                  status: 'checked_in',
                  checked_in_at: new Date().toISOString(),
                })
                .eq('qr_code', qrCode);

              if (updateError) {
                Alert.alert('Error', 'No se pudo completar el check-in.');
              } else {
                Alert.alert('Éxito', '¡Check-in completado! El personal ha sido notificado.');
              }
              setScanned(false);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al procesar el código QR.');
      setScanned(false);
    } finally {
      setProcessing(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Solicitando permisos de cámara...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={64} color="#444" />
        <Text style={styles.text}>Sin acceso a la cámara</Text>
        <Text style={styles.subtext}>Otorga permisos de cámara para escanear códigos QR</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.buttonText}>Abrir Configuración</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>

        {processing && (
          <View style={styles.processingOverlay}>
            <Ionicons name="checkmark-circle" size={64} color={GOLD} />
            <Text style={styles.processingText}>Procesando...</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Escanea el código QR de tu cita para hacer check-in</Text>
        {scanned && (
          <TouchableOpacity style={styles.rescanButton} onPress={() => setScanned(false)}>
            <Text style={styles.rescanText}>Escanear de nuevo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: GOLD,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: GRAY,
  },
  footerText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  rescanButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: GOLD,
    borderRadius: 8,
  },
  rescanText: {
    color: DARK,
    fontWeight: '600',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
  },
  subtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: GOLD,
    borderRadius: 8,
  },
  buttonText: {
    color: DARK,
    fontWeight: '600',
    fontSize: 16,
  },
});
