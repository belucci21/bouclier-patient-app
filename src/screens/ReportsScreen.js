import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const GOLD = '#b89a5a';
const DARK = '#1a1a1a';
const GRAY = '#2a2a2a';

const reportTypeColors = {
  lab: '#3b82f6',
  imaging: '#a855f7',
  consultation: '#22c55e',
  procedure: '#eab308',
  other: '#6b7280',
};

const reportTypeLabels = {
  lab: 'Laboratorio',
  imaging: 'Imagen',
  consultation: 'Consulta',
  procedure: 'Procedimiento',
  other: 'Otro',
};

export default function ReportsScreen() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        profiles!reports_patient_id_fkey(full_name),
        profiles!reports_doctor_id_fkey(full_name)
      `)
      .eq('patient_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error) {
      setReports(data || []);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const renderReport = ({ item }) => {
    const doctorName = item.profiles?.full_name || 'Doctor no asignado';
    const reportType = item.report_type || 'other';
    const typeColor = reportTypeColors[reportType] || reportTypeColors.other;
    const typeLabel = reportTypeLabels[reportType] || reportTypeLabels.other;
    const hasAttachments = item.pdf_url || (item.attachments && item.attachments.length > 0);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="document-text-outline" size={24} color={GOLD} />
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.title || 'Informe'}</Text>
            <Text style={styles.cardDoctor}>Dr. {doctorName}</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>{typeLabel}</Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={16} color="#888" />
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        {item.content && (
          <View style={styles.contentSection}>
            <Text style={styles.contentPreview} numberOfLines={3}>
              {item.content}
            </Text>
          </View>
        )}

        {hasAttachments && (
          <View style={styles.actionsSection}>
            {item.pdf_url && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => Linking.openURL(item.pdf_url)}
              >
                <Ionicons name="document-outline" size={18} color={GOLD} />
                <Text style={styles.actionButtonText}>Ver PDF</Text>
              </TouchableOpacity>
            )}
            {item.attachments && item.attachments.length > 0 && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => item.attachments.forEach(att => Linking.openURL(att.url))}
              >
                <Ionicons name="download-outline" size={18} color={GOLD} />
                <Text style={styles.actionButtonText}>
                  {item.attachments.length} archivo{item.attachments.length > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={reports}
        renderItem={renderReport}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#444" />
            <Text style={styles.emptyText}>No tienes informes registrados</Text>
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cardDoctor: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateText: {
    color: '#888',
    fontSize: 13,
  },
  contentSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  contentPreview: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(184,154,90,0.15)',
  },
  actionButtonText: {
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