import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Panel Central</Text>
        <Text style={styles.subtitle}>Modo Offline Activo</Text>
      </View>

      <View style={styles.grid}>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Hierarchy', { modulo: 'Ganadería' })}>
          <Text style={styles.cardIcon}>🐄</Text>
          <Text style={styles.cardTitle}>Ganadería</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Hierarchy', { modulo: 'Piscícola' })}>
          <Text style={styles.cardIcon}>🐟</Text>
          <Text style={styles.cardTitle}>Acuícola</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Hierarchy', { modulo: 'Cultivos' })}>
          <Text style={styles.cardIcon}>🌱</Text>
          <Text style={styles.cardTitle}>Cultivos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cardSync}>
          <Text style={styles.cardIcon}>🔄</Text>
          <Text style={styles.cardTitle}>Sincronizar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { padding: 20, backgroundColor: '#0f172a', paddingTop: 60, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 14, color: '#10b981', marginTop: 4, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, justifyContent: 'space-between' },
  card: { backgroundColor: 'white', width: '48%', padding: 20, borderRadius: 12, marginBottom: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardSync: { backgroundColor: '#e0f2fe', width: '48%', padding: 20, borderRadius: 12, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#7dd3fc' },
  cardIcon: { fontSize: 32, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#334155' }
});
