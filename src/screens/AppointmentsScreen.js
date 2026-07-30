import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const GOLD = '#b89a5a';
const DARK = '#1a1a1a';
const GRAY = '#2a2a2a';

const statusColors = {
  scheduled: '#eab308',
  confirmed: '#3b82f6',
  checked_in: '#a855f7',
  in_progress: GOLD,
  completed: '#22c55e',
  cancelled: '#ef4444',
  no_show: '#6b7280',
};

const statusLabels = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  checked_in: 'Check-in',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('upcoming');

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  async function fetchAppointments() {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        profiles!appointments_doctor_id_fkey(full_name),
        appointment_types(name, color, duration_minutes)
      `)
      .eq('patient_id', user?.id)
      .order('scheduled_at', { ascending: filter === 'upcoming' });

    if (filter === 'upcoming') {
      query = query.gte('scheduled_at', new Date().toISOString());
    } else {
      query = query.lt('scheduled_at', new Date().toISOString());
    }

    const { data, error } = await query;

    if (!error) {
      setAppointments(data || []);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const renderAppointment = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeDot, { backgroundColor: item.appointment_types?.color || GOLD }]} />
        <View style={styles.cardInfo}>
          <Text style={styles.cardType}>{item.appointment_types?.name || 'Cita'}</Text>
          <Text style={styles.cardDoctor}>Dr. {item.profiles?.full_name || 'Por asignar'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: (statusColors[item.status] || '#666') + '20' }]}>
          <Text style={[styles.statusText, { color: statusColors[item.status] || '#666' }]}>
            {statusLabels[item.status] || item.status}
          </Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#888" />
          <Text style={styles.detailText}>
            {new Date(item.scheduled_at).toLocaleDateString('es-MX', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#888" />
          <Text style={styles.detailText}>
            {new Date(item.scheduled_at).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {' · '}
            {item.duration_minutes || 30} min
          </Text>
        </View>
        {item.location && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#888" />
            <Text style={styles.detailText}>{item.location}</Text>
          </View>
        )}
      </View>

      {item.status === 'scheduled' && (
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.qrButton}>
            <Ionicons name="qr-code" size={20} color={GOLD} />
            <Text style={styles.qrButtonText}>Ver QR</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'upcoming' && styles.filterTabActive]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>
            Próximas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'past' && styles.filterTabActive]}
          onPress={() => setFilter('past')}
        >
          <Text style={[styles.filterText, filter === 'past' && styles.filterTextActive]}>
            Anteriores
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={appointments}
        renderItem={renderAppointment}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#444" />
            <Text style={styles.emptyText}>
              {filter === 'upcoming' ? 'No tienes citas próximas' : 'No tienes citas anteriores'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: GRAY,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: GOLD,
  },
  filterText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 14,
  },
  filterTextActive: {
    color: DARK,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: GRAY,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cardDoctor: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#aaa',
    fontSize: 13,
    textTransform: 'capitalize',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(184,154,90,0.15)',
  },
  qrButtonText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
});
