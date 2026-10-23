import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { BrandMark } from './src/components/Ui';
import { colors } from './src/theme/colors';
import type { Session } from './src/types';

const TOKEN_KEY = 'miniledger.session.token';
const PHONE_KEY = 'miniledger.session.phone';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let active = true;
    void AsyncStorage.multiGet([TOKEN_KEY, PHONE_KEY]).then(([tokenItem, phoneItem]) => {
      if (!active) return;
      const token = tokenItem[1];
      const phone = phoneItem[1];
      if (token && phone) setSession({ token, phone });
    }).catch((error: unknown) => {
      console.warn('Could not restore MiniLedger session:', error);
    }).finally(() => { if (active) setBooting(false); });
    return () => { active = false; };
  }, []);

  const authenticate = async (newSession: Session) => {
    await AsyncStorage.multiSet([[TOKEN_KEY, newSession.token], [PHONE_KEY, newSession.phone]]);
    setSession(newSession);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, PHONE_KEY]);
    setSession(null);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        {booting ? <View style={styles.boot}><BrandMark size={48} /><Text style={styles.bootTitle}>MiniLedger</Text><ActivityIndicator color={colors.primary} /><Text style={styles.bootHint}>Preparing your ledger…</Text></View>
          : session ? <DashboardScreen token={session.token} phone={session.phone} onLogout={logout} />
          : <LoginScreen onAuthenticated={authenticate} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 13 },
  bootTitle: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  bootHint: { color: colors.inkSecondary, fontSize: 12 }
});
