import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  useEffect(() => {
    const checkNetwork = async () => {
      const state = await Network.getNetworkStateAsync();
      setIsConnected(state.isConnected);
    };

    checkNetwork();
    
    // Ideally use @react-native-community/netinfo for real-time listeners,
    // but expo-network is fine for occasional checks in the MVP.
    const interval = setInterval(checkNetwork, 10000); // check every 10s

    return () => clearInterval(interval);
  }, []);

  return { isConnected };
}
