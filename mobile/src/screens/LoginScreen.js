import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function LoginScreen({ navigation }) {
  const [pin, setPin] = useState('');

  const handleLogin = () => {
    // In a real offline app, we check against a locally stored hashed PIN/Token
    if (pin === '1234') { // Mock offline auth
      navigation.replace('Home');
    } else {
      Alert.alert('Error', 'PIN incorrecto. Intente nuevamente.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SAS Agrícolas</Text>
      <Text style={styles.subtitle}>Portal Offline del Productor</Text>

      <View style={styles.card}>
        <Text style={styles.label}>PIN de Acceso</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          secureTextEntry
          value={pin}
          onChangeText={setPin}
          placeholder="****"
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Ingresar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 30 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  label: { fontSize: 14, color: '#334155', marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 18, marginBottom: 20, textAlign: 'center', tracking: 4 },
  button: { backgroundColor: '#0ea5e9', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
