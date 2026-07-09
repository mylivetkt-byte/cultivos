import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { database } from '../database';

export default function HierarchyScreen({ route, navigation }) {
  const { modulo } = route.params; // 'Ganadería', 'Piscícola', or 'Cultivos'
  const [fincas, setFincas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFincas();
  }, []);

  const loadFincas = async () => {
    try {
      const fincasCollection = database.collections.get('fincas');
      const allFincas = await fincasCollection.query().fetch();
      setFincas(allFincas);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFinca = (finca) => {
    // Navigate to next level: Lotes or Estanques
    navigation.navigate('LoteSelection', { modulo, fincaId: finca.id, fincaNombre: finca.nombre });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Cargando fincas locales...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Seleccione la Finca</Text>
        <Text style={styles.subtitle}>Módulo: {modulo}</Text>
      </View>

      <FlatList
        data={fincas}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay fincas sincronizadas. Vaya a Sincronizar.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleSelectFinca(item)}>
            <View>
              <Text style={styles.fincaName}>{item.nombre}</Text>
              <Text style={styles.fincaId}>ID Local: {item.id}</Text>
            </View>
            <Text style={styles.arrow}>{'>>'}</Text>
          </TouchableOpacity>
        )}
      />
      
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>Volver al Panel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748b' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, backgroundColor: '#0f172a', paddingTop: 50, paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 14, color: '#10b981', marginTop: 4 },
  card: { backgroundColor: 'white', padding: 20, marginHorizontal: 15, marginTop: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  fincaName: { fontSize: 18, fontWeight: 'bold', color: '#334155' },
  fincaId: { fontSize: 12, color: '#94a3b8', marginTop: 5 },
  arrow: { fontSize: 20, color: '#cbd5e1', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#94a3b8' },
  backBtn: { margin: 20, padding: 15, backgroundColor: '#e2e8f0', borderRadius: 8, alignItems: 'center' },
  backBtnText: { color: '#475569', fontWeight: 'bold' }
});
