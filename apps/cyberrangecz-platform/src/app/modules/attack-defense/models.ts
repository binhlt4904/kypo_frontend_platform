// Models cho Attack & Defense gameserver

export interface VpnProfile {
  id: number;
  name: string;
  net_number: number | null;
  active: boolean;
  vpn_config_available: boolean;
}

export interface GameTime {
  start: string | null;
  end: string | null;
  services_public: boolean;
  current_tick: number;
}

export interface CheckerInfo {
  id: number;
  name: string;
  checker_path: string;
  checker_enabled: boolean;
}

export interface CheckerScript {
  service_id: number;
  service_name: string;
  script_path: string;
  content: string;
}

export interface LogEntry {
  MESSAGE: string;
  __REALTIME_TIMESTAMP?: string;
  PRIORITY?: string;
  [key: string]: any;
}

export interface LogResponse {
  logs: LogEntry[];
  source: string;
}
