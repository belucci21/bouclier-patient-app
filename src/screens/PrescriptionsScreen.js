import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const GOLD = '#b89a5a';
const DARK = '#1a1a1a';
const GRAY = '#2a2a2a';

export default function PrescriptionsScreen() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  async function fetchPrescriptions() {
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        profiles!prescriptions_patient_id_fkey(full_name),
        profiles!prescriptions_doctor_id_fkey(full_name),
        appointments(scheduled_at)
      `)
      .eq('patient_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error) {
      setPrescriptions(data || []);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPrescriptions();
    setRefreshing(false);
  };

  const renderPrescription = ({ item }) => {
    const doctorName = item.profiles?.full_name || 'Doctor no asignado';
    const appointmentDate = item.appointments?.scheduled_at;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="medical-outline" size={24} color={GOLD} />
          <View style={styles.cardInfo}>
            <Text style={styles.cardDoctor}>Dr. {doctorName}</Text>
            {appointmentDate && (
              <Text style={styles.cardDate}>
                {new Date(appointmentDate).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            )}
          </View>
        </View>

        {item.medications && item.medications.length > 0 && (
          <View style={styles.medicationsSection}>
            <Text style={styles.medicationsTitle}>Medicamentos</Text>
            {item.medications.map((med, index) => (
              <View key={index} style={styles.medicationItem}>
                <View style={styles.medDot} />
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medDetail}>
                    {med.dosage} · {med.frequency}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {item.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notas:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {item.pdf_url && (
          <TouchableOpacity
            style={styles.pdfButton}
            onPress={() => Linking.openURL(item.pdf_url)}
          >
            <Ionicons name="document-outline" size={18} color={GOLD} />
            <Text style={styles.pdfButtonText}>Ver documento</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={prescriptions}
        renderItem={renderPrescription}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="medical-outline" size={64} color="#444" />
            <Text style={styles.emptyText}>No tienes recetas registradas</Text>
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
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardDoctor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cardDate: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  medicationsSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  medicationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GOLD,
    marginBottom: 8,
  },
  medicationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  medDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
    marginTop: 6,
    marginRight: 10,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  medDetail: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  notesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingVertical: 8,
  },
  pdfButtonText: {
    color: GOLD,
    fontSize: 14,
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