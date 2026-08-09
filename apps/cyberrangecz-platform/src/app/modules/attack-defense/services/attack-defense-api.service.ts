import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VpnProfile, GameTime, CheckerInfo, CheckerScript, LogResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AttackDefenseApiService {
  private baseUrl = '/gameserver/api';
  private adminToken = 'kypo-faust-admin-token-2026';

  private get headers(): HttpHeaders {
    return new HttpHeaders({ 'X-Admin-Token': this.adminToken });
  }

  constructor(private http: HttpClient) {}

  // ── VPN ──────────────────────────────────────────────────
  getVpnProfiles(): Observable<{ profiles: VpnProfile[] }> {
    return this.http.get<{ profiles: VpnProfile[] }>(
      `${this.baseUrl}/vpn/profiles/`,
      { headers: this.headers }
    );
  }

  toggleVpn(teamId: number, enabled: boolean): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/vpn/toggle/${teamId}/`,
      { enabled },
      { headers: this.headers }
    );
  }

  // ── Game Time ────────────────────────────────────────────
  getGameTime(): Observable<GameTime> {
    return this.http.get<GameTime>(
      `${this.baseUrl}/game/time/`,
      { headers: this.headers }
    );
  }

  setGameTime(data: Partial<GameTime>): Observable<GameTime> {
    return this.http.post<GameTime>(
      `${this.baseUrl}/game/time/`,
      data,
      { headers: this.headers }
    );
  }

  // ── Checker ──────────────────────────────────────────────
  getCheckers(): Observable<{ checkers: CheckerInfo[] }> {
    return this.http.get<{ checkers: CheckerInfo[] }>(
      `${this.baseUrl}/checker/`,
      { headers: this.headers }
    );
  }

  getCheckerScript(serviceId: number): Observable<CheckerScript> {
    return this.http.get<CheckerScript>(
      `${this.baseUrl}/checker/script/${serviceId}/`,
      { headers: this.headers }
    );
  }

  saveCheckerScript(serviceId: number, content: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/checker/script/${serviceId}/`,
      { content },
      { headers: this.headers }
    );
  }

  // ── Logs ─────────────────────────────────────────────────
  getGameserverLogs(lines = 100): Observable<LogResponse> {
    return this.http.get<LogResponse>(
      `${this.baseUrl}/logs/gameserver/?lines=${lines}`,
      { headers: this.headers }
    );
  }

  getVpnLogs(lines = 100): Observable<LogResponse> {
    return this.http.get<LogResponse>(
      `${this.baseUrl}/logs/vpn/?lines=${lines}`,
      { headers: this.headers }
    );
  }
}
