import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const GOLD = '#b89a5a';
const DARK = '#1a1a1a';
const GRAY = '#2a2a2a';
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function ScheduleAppointmentScreen({ navigation }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [types, setTypes] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [existingAppointments, setExistingAppointments] = useState([]);

  const [selectedType, setSelectedType] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetchTypesAndDoctors();
  }, []);

  async function fetchTypesAndDoctors() {
    setLoadingData(true);
    const [typesRes, doctorsRes] = await Promise.all([
      supabase.from('appointment_types').select('*').eq('is_active', true).order('name'),
      supabase.from('doctors').select('id, profiles!doctors_id_fkey(full_name)').eq('is_active', true),
    ]);
    setTypes(typesRes.data || []);
    setDoctors(doctorsRes.data || []);
    setLoadingData(false);
  }

  async function fetchDoctorData(doctorId) {
    const [availRes, blockRes, apptRes] = await Promise.all([
      supabase.from('availability').select('*').eq('doctor_id', doctorId).eq('is_active', true),
      supabase.from('blocked_times').select('*').eq('doctor_id', doctorId),
      supabase.from('appointments')
        .select('scheduled_at, duration_minutes')
        .eq('doctor_id', doctorId)
        .in('status', ['scheduled', 'confirmed']),
    ]);
    setAvailability(availRes.data || []);
    setBlockedTimes(blockRes.data || []);
    setExistingAppointments(apptRes.data || []);
  }

  function getAvailableSlots(date) {
    if (!date || !selectedDoctor || !selectedType) return [];
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const dayAvail = availability.filter(a => a.day_of_week === dayOfWeek);
    if (dayAvail.length === 0) return [];

    const duration = selectedType.duration_minutes || 30;
    const slots = [];

    for (const block of dayAvail) {
      const [startH, startM] = block.start_time.split(':').map(Number);
      const [endH, endM] = block.end_time.split(':').map(Number);
      let current = startH * 60 + startM;
      const end = endH * 60 + endM;

      while (current + duration <= end) {
        const h = Math.floor(current / 60);
        const m = current % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const dateTime = new Date(date);
        dateTime.setHours(h, m, 0, 0);

        const isBlocked = blockedTimes.some(bt => {
          const btDate = new Date(bt.start_time);
          return btDate.getTime() <= dateTime.getTime() && new Date(bt.end_time).getTime() > dateTime.getTime();
        });

        const isOccupied = existingAppointments.some(appt => {
          const apptStart = new Date(appt.scheduled_at);
          const apptEnd = new Date(apptStart.getTime() + (appt.duration_minutes || 30) * 60000);
          return dateTime.getTime() < apptEnd.getTime() && dateTime.getTime() + duration * 60000 > apptStart.getTime();
        });

        if (!isBlocked && !isOccupied) {
          slots.push(timeStr);
        }
        current += 30;
      }
    }
    return slots;
  }

  function getAvailableDates() {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (availability.some(a => a.day_of_week === d.getDay())) {
        dates.push(d);
      }
    }
    return dates;
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const [h, m] = selectedTime.split(':').map(Number);
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(h, m, 0, 0);

      const { error } = await supabase.from('appointments').insert({
        patient_id: user.id,
        doctor_id: selectedDoctor.id,
        appointment_type_id: selectedType.id,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: selectedType.duration_minutes || 30,
        status: 'scheduled',
        location: 'Torre EXERTIA, Boca del Río, Veracruz',
        notes: notes || null,
      });

      if (error) throw error;
      Alert.alert('Cita Agendada', 'Tu cita ha sido registrada correctamente.', [
        { text: 'OK', onPress: () => navigation.navigate('Mis Citas') }
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo agendar la cita');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(d) {
    return `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
  }

  if (loadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Progress */}
      <View style={styles.progress}>
        {[1, 2, 3, 4].map(s => (
          <View key={s} style={[styles.progressDot, step >= s && styles.progressDotActive]} />
        ))}
      </View>

      {/* Step 1: Type */}
      {step === 1 && (
        <View>
          <Text style={styles.stepTitle}>¿Qué tipo de cita necesitas?</Text>
          {types.map(t => (
            <TouchableOpacity key={t.id} style={styles.optionCard} onPress={() => { setSelectedType(t); setStep(2); }}>
              <View style={[styles.optionDot, { backgroundColor: t.color }]} />
              <View style={styles.optionInfo}>
                <Text style={styles.optionName}>{t.name}</Text>
                <Text style={styles.optionDetail}>{t.duration_minutes} minutos</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Step 2: Doctor */}
      {step === 2 && (
        <View>
          <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#999" />
            <Text style={styles.backBtnText}>Volver</Text>
          </TouchableOpacity>
          <Text style={styles.stepTitle}>Selecciona el doctor</Text>
          {doctors.map(d => (
            <TouchableOpacity key={d.id} style={styles.optionCard} onPress={async () => {
              setSelectedDoctor(d);
              await fetchDoctorData(d.id);
              setStep(3);
            }}>
              <View style={styles.doctorAvatar}>
                <Text style={styles.doctorAvatarText}>{(d.profiles?.full_name || 'D')[0]}</Text>
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionName}>{d.profiles?.full_name || 'Doctor'}</Text>
                <Text style={styles.optionDetail}>Especialista Bouclier</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Step 3: Date */}
      {step === 3 && (
        <View>
          <TouchableOpacity onPress={() => setStep(2)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#999" />
            <Text style={styles.backBtnText}>Volver</Text>
          </TouchableOpacity>
          <Text style={styles.stepTitle}>Selecciona el día</Text>
          <View style={styles.dateGrid}>
            {getAvailableDates().map((d, i) => {
              const isSelected = selectedDate && d.toDateString() === selectedDate.toDateString();
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dateCard, isSelected && styles.dateCardActive]}
                  onPress={() => { setSelectedDate(d); setSelectedTime(null); setStep(4); }}
                >
                  <Text style={[styles.dateDay, isSelected && styles.dateDayActive]}>{DAYS_ES[d.getDay()]}</Text>
                  <Text style={[styles.dateNum, isSelected && styles.dateNumActive]}>{d.getDate()}</Text>
                  <Text style={[styles.dateMonth, isSelected && styles.dateMonthActive]}>{MONTHS_ES[d.getMonth()]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Step 4: Time + Confirm */}
      {step === 4 && (
        <View>
          <TouchableOpacity onPress={() => setStep(3)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#999" />
            <Text style={styles.backBtnText}>Volver</Text>
          </TouchableOpacity>
          <Text style={styles.stepTitle}>Horarios disponibles</Text>
          <Text style={styles.stepSubtitle}>{formatDate(selectedDate)} · {selectedType?.name}</Text>

          {(() => {
            const slots = getAvailableSlots(selectedDate);
            if (slots.length === 0) return (
              <Text style={styles.noSlots}>No hay horarios disponibles para este día.</Text>
            );
            return (
              <View style={styles.timeGrid}>
                {slots.map(time => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeSlot, selectedTime === time && styles.timeSlotActive]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[styles.timeSlotText, selectedTime === time && styles.timeSlotTextActive]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })()}

          {selectedTime && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Resumen de tu cita</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tipo</Text>
                <Text style={styles.summaryValue}>{selectedType?.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Doctor</Text>
                <Text style={styles.summaryValue}>{selectedDoctor?.profiles?.full_name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Fecha</Text>
                <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Hora</Text>
                <Text style={styles.summaryValue}>{selectedTime}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Duración</Text>
                <Text style={styles.summaryValue}>{selectedType?.duration_minutes} min</Text>
              </View>

              <TextInput
                style={styles.notesInput}
                placeholder="Notas (opcional)"
                placeholderTextColor="#666"
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={DARK} />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirmar Cita</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK },
  contentContainer: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, backgroundColor: DARK, justifyContent: 'center', alignItems: 'center' },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  progressDot: { width: 12, height: 4, borderRadius: 2, backgroundColor: '#333' },
  progressDotActive: { width: 40, backgroundColor: GOLD },
  stepTitle: { color: '#fff', fontSize: 20, fontWeight: '600', marginBottom: 16 },
  stepSubtitle: { color: '#666', fontSize: 14, marginBottom: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backBtnText: { color: '#999', fontSize: 14 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: GRAY,
    borderRadius: 12, padding: 16, marginBottom: 10, gap: 12,
  },
  optionDot: { width: 10, height: 10, borderRadius: 5 },
  optionInfo: { flex: 1 },
  optionName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  optionDetail: { color: '#888', fontSize: 13, marginTop: 2 },
  doctorAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(184,154,90,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  doctorAvatarText: { color: GOLD, fontSize: 18, fontWeight: '700' },
  dateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateCard: {
    width: '22%', backgroundColor: GRAY, borderRadius: 10, padding: 12, alignItems: 'center',
  },
  dateCardActive: { backgroundColor: 'rgba(184,154,90,0.2)', borderWidth: 1, borderColor: GOLD },
  dateDay: { color: '#888', fontSize: 11 },
  dateDayActive: { color: GOLD },
  dateNum: { color: '#fff', fontSize: 20, fontWeight: '600', marginVertical: 2 },
  dateNumActive: { color: GOLD },
  dateMonth: { color: '#666', fontSize: 11 },
  dateMonthActive: { color: GOLD },
  noSlots: { color: '#666', fontSize: 14, textAlign: 'center', paddingVertical: 40 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  timeSlot: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    backgroundColor: GRAY, borderWidth: 1, borderColor: '#333',
  },
  timeSlotActive: { backgroundColor: GOLD, borderColor: GOLD },
  timeSlotText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  timeSlotTextActive: { color: DARK },
  summaryCard: { backgroundColor: GRAY, borderRadius: 16, padding: 20, marginTop: 8 },
  summaryTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { color: '#888', fontSize: 14 },
  summaryValue: { color: '#fff', fontSize: 14 },
  notesInput: {
    backgroundColor: '#333', borderRadius: 8, padding: 12, color: '#fff',
    fontSize: 14, marginTop: 16, marginBottom: 16, minHeight: 60, textAlignVertical: 'top',
  },
  confirmBtn: {
    backgroundColor: GOLD, borderRadius: 10, padding: 14, alignItems: 'center',
  },
  confirmBtnText: { color: DARK, fontSize: 16, fontWeight: '700' },
});
