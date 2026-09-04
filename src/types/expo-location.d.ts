declare module 'expo-location' {
  export enum LocationAccuracy {
    Lowest,
    Low,
    Balanced,
    High,
    Highest,
    BestForNavigation
  }

  export interface PermissionResponse {
    status: 'granted' | 'denied' | string;
    granted?: boolean;
  }

  export interface PositionCoords {
    latitude: number;
    longitude: number;
    altitude?: number | null;
    accuracy?: number | null;
    altitudeAccuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
  }

  export interface LocationObject {
    coords: PositionCoords;
    timestamp: number;
  }

  export function requestForegroundPermissionsAsync(): Promise<PermissionResponse>;
  export function getCurrentPositionAsync(options?: { accuracy?: LocationAccuracy }): Promise<LocationObject>;
  export function watchPositionAsync(options: { accuracy?: LocationAccuracy }, callback: (loc: LocationObject) => void): Promise<{ remove: () => void }>;
}
