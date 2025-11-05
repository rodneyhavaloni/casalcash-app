import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from './theme';
import Input from './Input';
import { Calendar } from 'react-native-calendars';

// Helpers: expects and returns DD-MM/YYYY
const pad = (n) => String(n).padStart(2, '0');
const formatDDMMYYYY = (date) => {
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  return `${d}-${m}/${y}`;
};
const parseDDMMYYYY = (s) => {
  const m = String(s || '').match(/^(\d{2})-(\d{2})\/(\d{4})$/);
  if (!m) return new Date();
  const [, dd, mm, yyyy] = m;
  const d = parseInt(dd, 10);
  const month = parseInt(mm, 10) - 1;
  const y = parseInt(yyyy, 10);
  const dt = new Date(y, month, d);
  if (isNaN(dt.getTime())) return new Date();
  return dt;
};

export default function DatePickerField({ label, value, onChange, placeholder = 'DD-MM/YYYY', useThemedCalendar = true, minDate, maxDate, error }) {
  const [show, setShow] = useState(false);
  const current = parseDDMMYYYY(value);
  const selectedISO = useMemo(() => {
    const d = parseDDMMYYYY(value);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, [value]);
  const minISO = useMemo(() => {
    if (!minDate) return undefined;
    const d = minDate instanceof Date ? minDate : new Date(minDate);
    if (isNaN(d.getTime())) return undefined;
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, [minDate]);
  const maxISO = useMemo(() => {
    if (!maxDate) return undefined;
    const d = maxDate instanceof Date ? maxDate : new Date(maxDate);
    if (isNaN(d.getTime())) return undefined;
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, [maxDate]);

  if (Platform.OS === 'web') {
    return (
      <View style={{ marginBottom: spacing.md }}>
        {!!label && (
          <Text style={{ color: '#6B7280', fontFamily: 'Poppins_500Medium', marginBottom: 6 }}>{label}</Text>
        )}
        <Input
          value={value}
          onChangeText={(t) => onChange && onChange(formatDDMMYYYYFromString(t))}
          placeholder={placeholder}
          keyboardType="number-pad"
          error={error}
        />
      </View>
    );
  }

  // Themed calendar modal (uses app palette) on mobile when enabled
  if (useThemedCalendar && Platform.OS !== 'web') {
    return (
      <View style={{ marginBottom: spacing.md }}>
        {!!label && (
          <Text style={{ color: '#6B7280', fontFamily: 'Poppins_500Medium', marginBottom: 6 }}>{label}</Text>
        )}
        <Pressable
          onPress={() => setShow(true)}
          android_ripple={{ color: '#E5E7EB' }}
          style={({ pressed }) => ([
            {
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: error ? '#F43F5E' : '#E5E7EB',
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
            pressed && { transform: [{ scale: 0.99 }], opacity: 0.98 },
          ])}
        >
          <Text style={{ color: value ? colors.text : '#9CA3AF', fontFamily: 'Poppins_500Medium' }}>
            {value || placeholder}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={'#9CA3AF'} />
        </Pressable>
        {!!error && (
          <Text style={{ color: '#F43F5E', marginTop: 4, fontFamily: 'Poppins_400Regular' }}>{error}</Text>
        )}

        <Modal
          animationType="fade"
          transparent
          visible={show}
          onRequestClose={() => setShow(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 360, padding: 12 }}>
              <Calendar
                initialDate={selectedISO}
                markedDates={{ [selectedISO]: { selected: true, selectedColor: colors.green } }}
                minDate={minISO}
                maxDate={maxISO}
                onDayPress={(day) => {
                  // day.dateString = YYYY-MM-DD
                  const [yy, mm, dd] = day.dateString.split('-');
                  const formatted = `${dd}-${mm}/${yy}`;
                  onChange && onChange(formatted);
                  setShow(false);
                }}
                theme={{
                  backgroundColor: '#FFFFFF',
                  calendarBackground: '#FFFFFF',
                  textSectionTitleColor: '#6B7280',
                  monthTextColor: colors.greenDark,
                  arrowColor: colors.greenDark,
                  todayTextColor: colors.green,
                  dayTextColor: '#111827',
                  textDisabledColor: '#D1D5DB',
                  selectedDayBackgroundColor: colors.green,
                  selectedDayTextColor: '#FFFFFF',
                }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <Pressable onPress={() => setShow(false)} style={({ pressed }) => ([{ paddingHorizontal: 12, paddingVertical: 8 }, pressed && { opacity: 0.8 }])}>
                  <Text style={{ color: colors.greenDark, fontFamily: 'Poppins_600SemiBold' }}>Fechar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Fallback para nativo (iOS/Android) mantendo leve personalização (limitada) e para Web já tratado acima
  return (
    <View style={{ marginBottom: spacing.md }}>
      {!!label && (
        <Text style={{ color: '#6B7280', fontFamily: 'Poppins_500Medium', marginBottom: 6 }}>{label}</Text>
      )}
      <Pressable
        onPress={() => setShow(true)}
        android_ripple={{ color: '#E5E7EB' }}
        style={({ pressed }) => ([
          {
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: error ? '#F43F5E' : '#E5E7EB',
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
          pressed && { transform: [{ scale: 0.99 }], opacity: 0.98 },
        ])}
      >
        <Text style={{ color: value ? colors.text : '#9CA3AF', fontFamily: 'Poppins_500Medium' }}>
          {value || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={'#9CA3AF'} />
      </Pressable>
      {!!error && (
        <Text style={{ color: '#F43F5E', marginTop: 4, fontFamily: 'Poppins_400Regular' }}>{error}</Text>
      )}

      {show && (
        <DateTimePicker
          value={current}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          // Pequena personalização: no iOS muda a cor do texto
          {...(Platform.OS === 'ios' ? { textColor: colors.text } : {})}
          minimumDate={minDate instanceof Date ? minDate : (minDate ? new Date(minDate) : undefined)}
          maximumDate={maxDate instanceof Date ? maxDate : (maxDate ? new Date(maxDate) : undefined)}
          onChange={(event, selectedDate) => {
            if (Platform.OS !== 'ios') {
              setShow(false);
            }
            if (event.type === 'dismissed') {
              if (Platform.OS === 'ios') setShow(false);
              return;
            }
            const dt = selectedDate || current;
            const formatted = formatDDMMYYYY(dt);
            onChange && onChange(formatted);
            if (Platform.OS === 'ios') setShow(false);
          }}
        />
      )}
    </View>
  );
}

// helper para web: formatar string livre em DD-MM/YYYY
function formatDDMMYYYYFromString(t = '') {
  const digits = String(t).replace(/\D/g, '');
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  let out = d;
  if (m) out += '-' + m;
  if (y) out += '/' + y;
  return out;
}
