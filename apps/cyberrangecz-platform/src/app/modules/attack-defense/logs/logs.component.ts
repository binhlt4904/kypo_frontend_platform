import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttackDefenseApiService } from '../services/attack-defense-api.service';
import { LogEntry } from '../models';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ad-page">
      <div class="ad-header">
        <h2>Logs</h2>
        <p class="subtitle">Log của gameserver và VPN service</p>
      </div>

      <!-- Tab switcher -->
      <div class="tab-bar">
        <button
          [class]="activeTab === 'gameserver' ? 'tab active' : 'tab'"
          (click)="switchTab('gameserver')">
          🎮 Gameserver
        </button>
        <button
          [class]="activeTab === 'vpn' ? 'tab active' : 'tab'"
          (click)="switchTab('vpn')">
          🔒 VPN
        </button>

        <div class="tab-actions">
          <select [(ngModel)]="lineCount" (change)="loadLogs()" class="line-select">
            <option [value]="50">50 dòng</option>
            <option [value]="100">100 dòng</option>
            <option [value]="200">200 dòng</option>
            <option [value]="500">500 dòng</option>
          </select>
          <button class="btn btn-refresh" (click)="loadLogs()" [disabled]="loading">
            {{ loading ? '⟳' : '↺ Refresh' }}
          </button>
        </div>
      </div>

      <!-- Log output -->
      <div class="log-container">
        <div class="loading" *ngIf="loading">Đang tải logs...</div>
        <div class="log-content" *ngIf="!loading">
          <div
            *ngFor="let entry of logs"
            [class]="getLogClass(entry)">
            <span class="log-time">{{ formatTime(entry) }}</span>
            <span class="log-msg">{{ entry.MESSAGE }}</span>
          </div>
          <div class="empty" *ngIf="logs.length === 0">
            Không có log nào.
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ad-page { padding: 24px; height: calc(100vh - 120px); display: flex; flex-direction: column; }
    .ad-header { margin-bottom: 16px; flex-shrink: 0; }
    .ad-header h2 { color: #e05f00; font-size: 1.5rem; margin: 0 0 4px; }
    .subtitle { color: #666; margin: 0; font-size: 0.9rem; }
    .tab-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-shrink: 0; }
    .tab { padding: 8px 18px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 0.9rem; }
    .tab.active { background: #e05f00; color: #fff; border-color: #e05f00; }
    .tab-actions { margin-left: auto; display: flex; gap: 8px; align-items: center; }
    .line-select { padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.85rem; }
    .btn { padding: 6px 14px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500; }
    .btn-refresh { background: #f5f5f5; color: #333; border: 1px solid #ddd; }
    .btn:disabled { opacity: 0.6; }
    .log-container { flex: 1; background: #1a1a2e; border-radius: 8px; overflow-y: auto; min-height: 0; }
    .log-content { padding: 12px; font-family: 'Courier New', monospace; font-size: 0.82rem; }
    .log-line { display: flex; gap: 12px; padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
    .log-line:hover { background: rgba(255,255,255,0.04); }
    .log-error { color: #ff6b6b; }
    .log-warn { color: #ffd93d; }
    .log-info { color: #c3c3c3; }
    .log-time { color: #6272a4; min-width: 180px; flex-shrink: 0; }
    .log-msg { flex: 1; word-break: break-all; }
    .loading, .empty { padding: 40px; text-align: center; color: #888; }
  `]
})
export class LogsComponent implements OnInit, OnDestroy {
  activeTab: 'gameserver' | 'vpn' = 'gameserver';
  logs: LogEntry[] = [];
  loading = false;
  lineCount = 100;
  private refreshInterval: any;

  constructor(private api: AttackDefenseApiService) {}

  ngOnInit(): void {
    this.loadLogs();
    // Auto refresh mỗi 10 giây
    this.refreshInterval = setInterval(() => this.loadLogs(), 10000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  switchTab(tab: 'gameserver' | 'vpn'): void {
    this.activeTab = tab;
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    const obs = this.activeTab === 'gameserver'
      ? this.api.getGameserverLogs(this.lineCount)
      : this.api.getVpnLogs(this.lineCount);

    obs.subscribe({
      next: (res) => {
        this.logs = res.logs;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  getLogClass(entry: LogEntry): string {
    const priority = parseInt(entry['PRIORITY'] ?? '6');
    if (priority <= 3) return 'log-line log-error';
    if (priority === 4) return 'log-line log-warn';
    return 'log-line log-info';
  }

  formatTime(entry: LogEntry): string {
    const ts = entry['__REALTIME_TIMESTAMP'];
    if (!ts) return '—';
    const ms = parseInt(ts) / 1000;
    return new Date(ms).toLocaleString('vi-VN');
  }
}
