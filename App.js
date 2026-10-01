import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, StatusBar, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const C = { bg: '#0E1726', card: '#17233A', line: '#26364F', text: '#E8F1F8', dim: '#8FA3BC', ice: '#7FB5D6', flame: '#F2A65A' };
const YEAR = 2026;
const START = new Date(YEAR, 9, 1); // Oct 1
const END = new Date(YEAR, 11, 31); // Dec 31
const TOTAL = Math.round((END - START) / 864e5) + 1;
const MONTHS = [{ m: 9, n: 'October' }, { m: 10, n: 'November' }, { m: 11, n: 'December' }];
const KEY = 'winter-arc-v1';

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const inArc = (d) => d >= START && d <= END;
const today0 = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };

const DEFAULT = {
  habits: [{ id: 'h1', name: 'Workout' }, { id: 'h2', name: 'Study or code' }, { id: 'h3', name: 'Sleep by 11pm' }],
  log: {},
};

export default function App() {
  const [data, setData] = useState(DEFAULT);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('today');
  const [month, setMonth] = useState(Math.min(Math.max(today0().getMonth(), 9), 11));
  const [sel, setSel] = useState(keyOf(today0()));
  const [newHabit, setNewHabit] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => { if (v) setData(JSON.parse(v)); }).catch(() => {}).finally(() => setReady(true));
  }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {}); }, [data, ready]);

  const { habits, log } = data;
  const today = today0();
  const todayKey = keyOf(today);
  const doneOn = (k) => (log[k] || []).filter((id) => habits.some((h) => h.id === id));
  const isFull = (k) => habits.length > 0 && doneOn(k).length === habits.length;

  const toggle = (k, id) => {
    const cur = log[k] || [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    setData({ ...data, log: { ...log, [k]: next } });
  };

  // Streak: consecutive fully completed days. Today only counts once finished, but doesn't break the streak while open.
  let streak = 0;
  let d = isFull(todayKey) ? today : addDays(today, -1);
  while (inArc(d) && isFull(keyOf(d))) { streak++; d = addDays(d, -1); }
  let best = 0, run = 0;
  for (let x = START; x <= today && x <= END; x = addDays(x, 1)) { run = isFull(keyOf(x)) ? run + 1 : 0; best = Math.max(best, run); }
  const dayNum = Math.min(Math.max(Math.round((today - START) / 864e5) + 1, 0), TOTAL);
  const started = today >= START;
  const doneToday = isFull(todayKey);
  const msg = !started ? 'Your arc starts on Oct 1.' : doneToday ? `All done. Streak upgraded to ${streak}!` : streak > 0 ? `Finish today to keep your ${streak}-day streak.` : 'Complete every habit today to start a streak.';

  const addHabit = () => {
    const name = newHabit.trim();
    if (!name) return;
    setData({ ...data, habits: [...habits, { id: 'h' + Date.now(), name }] });
    setNewHabit('');
  };
  const removeHabit = (id) => setData({ ...data, habits: habits.filter((h) => h.id !== id) });

  const Checklist = ({ k, editable }) => (
    <View>
      {habits.map((h) => {
        const on = (log[k] || []).includes(h.id);
        return (
          <Pressable key={h.id} disabled={!editable} onPress={() => toggle(k, h.id)} style={[s.row, on && s.rowOn]}>
            <View style={[s.box, on && s.boxOn]}>{on && <Text style={s.tick}>✓</Text>}</View>
            <Text style={[s.rowText, on && { color: C.dim, textDecorationLine: 'line-through' }]}>{h.name}</Text>
          </Pressable>
        );
      })}
      {habits.length === 0 && <Text style={s.dim}>No habits yet. Add some in the Habits tab.</Text>}
    </View>
  );

  const renderToday = () => (
    <ScrollView contentContainerStyle={s.pad}>
      <View style={s.hero}>
        <Text style={s.flame}>🔥</Text>
        <Text style={s.streakNum}>{streak}</Text>
        <Text style={s.streakLbl}>day streak</Text>
        <Text style={s.msg}>{msg}</Text>
      </View>
      <View style={s.statRow}>
        <View style={s.stat}><Text style={s.statNum}>{started ? dayNum : 0}/{TOTAL}</Text><Text style={s.dim}>arc days</Text></View>
        <View style={s.stat}><Text style={s.statNum}>{best}</Text><Text style={s.dim}>best streak</Text></View>
      </View>
      <View style={s.bar}><View style={[s.barFill, { width: `${(started ? dayNum : 0) / TOTAL * 100}%` }]} /></View>
      <Text style={s.h2}>Today: {doneOn(todayKey).length}/{habits.length} done</Text>
      {started ? <Checklist k={todayKey} editable /> : <Text style={s.dim}>Check-ins open on Oct 1.</Text>}
    </ScrollView>
  );

  const renderCalendar = () => {
    const first = new Date(YEAR, month, 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const count = new Date(YEAR, month + 1, 0).getDate();
    const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => new Date(YEAR, month, i + 1))];
    const selDate = new Date(sel + 'T00:00:00');
    const canEdit = inArc(selDate) && selDate <= today;
    return (
      <ScrollView contentContainerStyle={s.pad}>
        <View style={s.tabs}>
          {MONTHS.map((m) => (
            <Pressable key={m.m} onPress={() => setMonth(m.m)} style={[s.chip, month === m.m && s.chipOn]}>
              <Text style={[s.chipText, month === m.m && { color: C.bg }]}>{m.n}</Text>
            </Pressable>
          ))}
        </View>
        <View style={s.grid}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => <Text key={i} style={s.wd}>{w}</Text>)}
          {cells.map((c, i) => {
            if (!c) return <View key={i} style={s.cell} />;
            const k = keyOf(c);
            const ratio = habits.length ? doneOn(k).length / habits.length : 0;
            const past = c <= today;
            const bg = !past ? 'transparent' : ratio === 1 ? C.flame : ratio > 0 ? C.ice + '66' : C.card;
            return (
              <Pressable key={i} onPress={() => setSel(k)} style={[s.cell, { backgroundColor: bg }, k === todayKey && s.todayCell, k === sel && s.selCell]}>
                <Text style={[s.cellText, ratio === 1 && past && { color: C.bg, fontWeight: '700' }]}>{c.getDate()}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={s.dim}>Orange = every habit done. Light blue = partly done.</Text>
        <Text style={s.h2}>{selDate.toDateString()}</Text>
        {canEdit ? <Checklist k={sel} editable /> : <Text style={s.dim}>{inArc(selDate) ? 'This day has not happened yet.' : 'Outside your arc.'}</Text>}
      </ScrollView>
    );
  };

  const renderHabits = () => (
    <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h2}>Your habits</Text>
      {habits.map((h) => (
        <View key={h.id} style={s.row}>
          <Text style={[s.rowText, { flex: 1 }]}>{h.name}</Text>
          <Pressable onPress={() => removeHabit(h.id)}><Text style={{ color: C.dim }}>Remove</Text></Pressable>
        </View>
      ))}
      <View style={[s.row, { marginTop: 12 }]}>
        <TextInput value={newHabit} onChangeText={setNewHabit} onSubmitEditing={addHabit} placeholder="Add a habit" placeholderTextColor={C.dim} style={s.input} />
        <Pressable onPress={addHabit} style={s.addBtn}><Text style={{ color: C.bg, fontWeight: '700' }}>Add</Text></Pressable>
      </View>
      <Text style={[s.dim, { marginTop: 16 }]}>A day counts toward your streak only when every habit is done. Arc runs Oct 1 to Dec 31.</Text>
    </ScrollView>
  );

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" />
      <Text style={s.title}>Winter Arc</Text>
      <View style={{ flex: 1 }}>{tab === 'today' ? renderToday() : tab === 'calendar' ? renderCalendar() : renderHabits()}</View>
      <View style={s.nav}>
        {[['today', 'Today'], ['calendar', 'Calendar'], ['habits', 'Habits']].map(([id, label]) => (
          <Pressable key={id} onPress={() => setTab(id)} style={s.navItem}>
            <Text style={[s.navText, tab === id && { color: C.ice, fontWeight: '700' }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: StatusBar.currentHeight || 0 },
  title: { color: C.text, fontSize: 22, fontWeight: '700', paddingHorizontal: 20, paddingTop: 12 },
  pad: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', backgroundColor: C.card, borderRadius: 20, padding: 24, marginBottom: 14 },
  flame: { fontSize: 44 },
  streakNum: { color: C.flame, fontSize: 64, fontWeight: '800', lineHeight: 70 },
  streakLbl: { color: C.text, fontSize: 16 },
  msg: { color: C.dim, marginTop: 10, textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14 },
  statNum: { color: C.text, fontSize: 20, fontWeight: '700' },
  bar: { height: 8, backgroundColor: C.card, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: 8, backgroundColor: C.ice },
  h2: { color: C.text, fontSize: 18, fontWeight: '700', marginTop: 18, marginBottom: 10 },
  dim: { color: C.dim },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 8 },
  rowOn: { borderColor: C.ice, borderWidth: 1 },
  rowText: { color: C.text, fontSize: 16 },
  box: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.line, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.ice, borderColor: C.ice },
  tick: { color: C.bg, fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: C.card },
  chipOn: { backgroundColor: C.ice },
  chipText: { color: C.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  wd: { width: '14.28%', textAlign: 'center', color: C.dim, marginBottom: 6 },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  cellText: { color: C.text },
  todayCell: { borderColor: C.ice },
  selCell: { borderColor: C.text, borderWidth: 2 },
  input: { flex: 1, color: C.text, fontSize: 16, paddingVertical: 4 },
  addBtn: { backgroundColor: C.ice, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  nav: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  navText: { color: C.dim, fontSize: 15 },
});
