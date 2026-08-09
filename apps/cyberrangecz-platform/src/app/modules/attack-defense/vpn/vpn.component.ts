import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttackDefenseApiService } from '../services/attack-defense-api.service';
import { VpnProfile } from '../models';

@Component({
  selector: 'app-vpn',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ad-page">
      <div class="ad-header">
        <h2>VPN Management</h2>
        <p class="subtitle">Quản lý VPN profile và trạng thái kết nối của các team</p>
      </div>

      <div class="ad-card" *ngIf="loading">
        <div class="loading">Đang tải danh sách team...</div>
      </div>

      <div class="ad-card" *ngIf="!loading">
        <table class="ad-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Net Number</th>
              <th>VPN Config</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let profile of profiles">
              <td>{{ profile.name }}</td>
              <td>{{ profile.net_number ?? '—' }}</td>
              <td>
                <span [class]="profile.vpn_config_available ? 'badge badge-ok' : 'badge badge-na'">
                  {{ profile.vpn_config_available ? 'Có sẵn' : 'Chưa có' }}
                </span>
              </td>
              <td>
                <span [class]="profile.active ? 'badge badge-ok' : 'badge badge-off'">
                  {{ profile.active ? 'Enabled' : 'Disabled' }}
                </span>
              </td>
              <td>
                <button
                  [class]="profile.active ? 'btn btn-danger' : 'btn btn-primary'"
                  (click)="toggleVpn(profile)">
                  {{ profile.active ? 'Disable' : 'Enable' }}
                </button>
              </td>
            </tr>
            <tr *ngIf="profiles.length === 0">
              <td colspan="5" class="empty">Chưa có team nào được đăng ký.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .ad-page { padding: 24px; }
    .ad-header { margin-bottom: 24px; }
    .ad-header h2 { color: #e05f00; font-size: 1.5rem; margin: 0 0 4px; }
    .subtitle { color: #666; margin: 0; font-size: 0.9rem; }
    .ad-card { background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.1); padding: 20px; }
    .loading { text-align: center; padding: 40px; color: #888; }
    .ad-table { width: 100%; border-collapse: collapse; }
    .ad-table th { background: #f5f5f5; padding: 12px 16px; text-align: left; font-weight: 600; color: #333; border-bottom: 2px solid #e0e0e0; }
    .ad-table td { padding: 12px 16px; border-bottom: 1px solid #f0f0f0; }
    .ad-table tr:hover td { background: #fafafa; }
    .badge { padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 500; }
    .badge-ok { background: #e8f5e9; color: #2e7d32; }
    .badge-off { background: #ffebee; color: #c62828; }
    .badge-na { background: #f5f5f5; color: #757575; }
    .btn { padding: 6px 14px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500; }
    .btn-primary { background: #e05f00; color: #fff; }
    .btn-danger { background: #d32f2f; color: #fff; }
    .empty { text-align: center; color: #999; padding: 32px; }
  `]
})
export class VpnComponent implements OnInit {
  profiles: VpnProfile[] = [];
  loading = true;

  constructor(private api: AttackDefenseApiService) {}

  ngOnInit(): void {
    this.loadProfiles();
  }

  loadProfiles(): void {
    this.loading = true;
    this.api.getVpnProfiles().subscribe({
      next: (res) => {
        this.profiles = res.profiles;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  toggleVpn(profile: VpnProfile): void {
    this.api.toggleVpn(profile.id, !profile.active).subscribe({
      next: () => {
        profile.active = !profile.active;
      }
    });
  }
}
