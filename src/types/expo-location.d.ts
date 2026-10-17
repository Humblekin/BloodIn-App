declare module 'expo-location' {
  export enum PermissionStatus {
    GRANTED = 'granted',
    DENIED = 'denied',
    UNDETERMINED = 'undetermined'
  }

  export enum Accuracy {
    Lowest = 1,
    Low = 2,
    Balanced = 3,
    High = 4,
    Highest = 5,
    BestForNavigation = 6
  }

  export enum LocationAccuracy {
    Lowest = 1,
    Low = 2,
    Balanced = 3,
    High = 4,
    Highest = 5,
    BestForNavigation = 6
  }

  export interface PermissionResponse {
    status: PermissionStatus;
    granted: boolean;
    canAskAgain: boolean;
    expires?: 'never' | number;
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

  export function hasServicesEnabledAsync(): Promise<boolean>;
  export function getForegroundPermissionsAsync(): Promise<PermissionResponse>;
  export function requestForegroundPermissionsAsync(): Promise<PermissionResponse>;
  export function enableNetworkProviderAsync(): Promise<void>;
  export function getCurrentPositionAsync(options?: { accuracy?: Accuracy | LocationAccuracy; mayShowUserSettingsDialog?: boolean }): Promise<LocationObject>;
  export function watchPositionAsync(options: { accuracy?: Accuracy | LocationAccuracy }, callback: (loc: LocationObject) => void): Promise<{ remove: () => void }>;
}
