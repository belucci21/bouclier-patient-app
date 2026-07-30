import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const GOLD = '#b89a5a';
const DARK = '#1a1a1a';
const GRAY = '#2a2a2a';

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles!appointments_doctor_id_fkey(full_name),
        appointment_types(name, color)
      `)
      .eq('patient_id', user?.id)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(5);

    if (!error) {
      setAppointments(data || []);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const nextAppointment = appointments[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
    >
      {/* Welcome */}
      <View style={styles.welcomeCard}>
        <Text style={styles.greeting}>Hola, {profile?.full_name?.split(' ')[0] || 'Paciente'}</Text>
        <Text style={styles.welcomeSubtitle}>Bienvenido a tu portal</Text>
      </View>

      {/* Next Appointment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Próxima Cita</Text>
        {nextAppointment ? (
          <View style={styles.appointmentCard}>
            <View style={[styles.typeIndicator, { backgroundColor: nextAppointment.appointment_types?.color || GOLD }]} />
            <View style={styles.appointmentInfo}>
              <Text style={styles.appointmentType}>{nextAppointment.appointment_types?.name || 'Cita'}</Text>
              <Text style={styles.appointmentDoctor}>
                Dr. {nextAppointment.profiles?.full_name || 'Por asignar'}
              </Text>
              <Text style={styles.appointmentDate}>
                {new Date(nextAppointment.scheduled_at).toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
              <Text style={styles.appointmentTime}>
                {new Date(nextAppointment.scheduled_at).toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View style={styles.qrBadge}>
              <Ionicons name="qr-code" size={24} color={GOLD} />
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={48} color="#444" />
            <Text style={styles.emptyText}>No tienes citas programadas</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="calendar-outline" size={32} color={GOLD} />
            <Text style={styles.actionText}>Agendar Cita</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="qr-code-outline" size={32} color={GOLD} />
            <Text style={styles.actionText}>Check-in QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="document-text-outline" size={32} color={GOLD} />
            <Text style={styles.actionText}>Mis Recetas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="chatbubble-outline" size={32} color={GOLD} />
            <Text style={styles.actionText}>Contactar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Upcoming Appointments */}
      {appointments.length > 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Otras Citas</Text>
          {appointments.slice(1).map(apt => (
            <View key={apt.id} style={styles.miniCard}>
              <View style={[styles.miniIndicator, { backgroundColor: apt.appointment_types?.color || GOLD }]} />
              <View style={styles.miniInfo}>
                <Text style={styles.miniType}>{apt.appointment_types?.name}</Text>
                <Text style={styles.miniDate}>
                  {new Date(apt.scheduled_at).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {' · '}
                  {new Date(apt.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK,
  },
  content: {
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: GRAY,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'serif',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  appointmentCard: {
    backgroundColor: GRAY,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIndicator: {
    width: 4,
    height: 60,
    borderRadius: 2,
    marginRight: 16,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  appointmentDoctor: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 2,
  },
  appointmentDate: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  appointmentTime: {
    fontSize: 13,
    color: GOLD,
    fontWeight: '500',
  },
  qrBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(184,154,90,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: GRAY,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    marginTop: 12,
    fontSize: 14,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: GRAY,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  actionText: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  miniCard: {
    backgroundColor: GRAY,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniIndicator: {
    width: 3,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  miniInfo: {
    flex: 1,
  },
  miniType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  miniDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
});
