import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Platform, BackHandler, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';

// --- CONFIGURATION ---
const IS_PRODUCTION = false; // Toggle this to true before building for Play Store
const PRODUCTION_URL = 'https://your-live-app-url.com'; // Change this to your deployed URL
const LOCAL_IP = '10.70.70.138'; 
const DEV_URL = `http://${LOCAL_IP}:3000`;

const APP_URL = IS_PRODUCTION ? PRODUCTION_URL : DEV_URL;

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    const onBackPress = () => {
      if (webViewRef.current && canGoBack) {
        webViewRef.current.goBack();
        return true; // prevent default behavior (closing the app)
      }
      return false; // allow default behavior
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      subscription.remove();
    };
  }, [canGoBack]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
        <StatusBar style="auto" />
        <WebView 
          ref={webViewRef}
          source={{ uri: APP_URL }}
          style={styles.webview}
          startInLoadingState={true}
          scalesPageToFit={true}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    // SafeAreaView from react-native-safe-area-context handles top inset automatically,
    // so we only add extra margin if specifically needed.
  },
  webview: {
    flex: 1,
  },
});
