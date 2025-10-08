// TypeScript type definitions for the IPC bridge API

export interface TallyStatus {
  status: string;
  companyName?: string;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  level: 'INFO' | 'WARN' | 'ERROR';
}

export interface BridgeAPI {
  // Tally Status Methods
  checkTallyStatus(): Promise<TallyStatus>;
  
  // Sync Methods
  runManualSync(): Promise<string>;
  getSyncLogs(): Promise<LogEntry[]>;
  getNextSyncTime(): Promise<string>;
  setSyncInterval(minutes: number): Promise<string>;
  stopSyncInterval(): Promise<string>;
  
  // Configuration Methods
  getLocalUri(): Promise<string>;
  setLocalUri(uri: string): Promise<{ success: boolean; error?: string }>;
  
  // Application Methods
  reloadApp(): Promise<void>;
  
  // Event Listeners
  onRefreshLogs(callback: () => void): () => void;
}

// Global type declaration for the bridge API exposed via preload script
declare global {
  interface Window {
    bridge: BridgeAPI;
  }
}

export {};