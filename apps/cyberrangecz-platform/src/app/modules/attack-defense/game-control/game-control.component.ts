import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttackDefenseApiService } from '../services/attack-defense-api.service';
import { GameTime } from '../models';

@Component({
  selector: 'app-game-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ad-page">
      <div class="ad-header">
        <h2>Game Control — Start / End</h2>
        <p class="subtitle">Thiết lập thời gian bắt đầu và kết thúc cuộc thi</p>
      </div>

      <div class="ad-card" *ngIf="gameTime">
        <!-- Current Status -->
        <div class="status-row">
          <div class="status-item">
            <span class="label">Current Tick</span>
            <span class="value">{{ gameTime.current_tick }}</span>
          </div>
          <div class="status-item">
            <span class="label">Services Public</span>
            <span [class]="gameTime.services_public ? 'badge badge-ok' : 'badge badge-off'">
              {{ gameTime.services_public ? 'Yes' : 'No' }}
            </span>
          </div>
        </div>

        <hr />

        <!-- Edit Form -->
        <div class="form-group">
          <label>Thời gian bắt đầu (Start)</label>
          <input type="datetime-local" [(ngModel)]="form.start" class="form-input" />
        </div>

        <div class="form-group">
          <label>Thời gian kết thúc (End)</label>
          <input type="datetime-local" [(ngModel)]="form.end" class="form-input" />
        </div>

        <div class="form-group checkbox-group">
          <input type="checkbox" [(ngModel)]="form.services_public" id="svcPublic" />
          <label for="svcPublic">Services Public (checker bắt đầu chạy)</label>
        </div>

        <div class="actions">
          <button class="btn btn-primary" (click)="save()" [disabled]="saving">
            {{ saving ? 'Đang lưu...' : 'Lưu cài đặt' }}
          </button>
          <span class="success-msg" *ngIf="saved">✓ Đã lưu thành công</span>
        </div>
      </div>

      <div class="ad-card" *ngIf="!gameTime && !loading">
        <div class="empty">GameControl chưa được cấu hình. Vui lòng tạo qua Django Admin.</div>
      </div>

      <div class="ad-card" *ngIf="loading">
        <div class="loading">Đang tải...</div>
      </div>
    </div>
  `,
  styles: [`
    .ad-page { padding: 24px; }
    .ad-header { margin-bottom: 24px; }
    .ad-header h2 { color: #e05f00; font-size: 1.5rem; margin: 0 0 4px; }
    .subtitle { color: #666; margin: 0; font-size: 0.9rem; }
    .ad-card { background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.1); padding: 24px; max-width: 600px; }
    .status-row { display: flex; gap: 32px; margin-bottom: 16px; }
    .status-item { display: flex; flex-direction: column; gap: 4px; }
    .label { font-size: 0.8rem; color: #888; text-transform: uppercase; }
    .value { font-size: 1.4rem; font-weight: 700; color: #333; }
    hr { border: none; border-top: 1px solid #f0f0f0; margin: 16px 0; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-weight: 500; margin-bottom: 6px; color: #444; }
    .form-input { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.95rem; box-sizing: border-box; }
    .checkbox-group { display: flex; align-items: center; gap: 8px; }
    .checkbox-group label { margin: 0; }
    .actions { display: flex; align-items: center; gap: 16px; margin-top: 24px; }
    .btn { padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 500; }
    .btn-primary { background: #e05f00; color: #fff; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .success-msg { color: #2e7d32; font-size: 0.9rem; }
    .badge { padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 500; }
    .badge-ok { background: #e8f5e9; color: #2e7d32; }
    .badge-off { background: #ffebee; color: #c62828; }
    .loading, .empty { text-align: center; padding: 40px; color: #888; }
  `]
})
export class GameControlComponent implements OnInit {
  gameTime: GameTime | null = null;
  loading = true;
  saving = false;
  saved = false;

  form = {
    start: '',
    end: '',
    services_public: false,
  };

  constructor(private api: AttackDefenseApiService) {}

  ngOnInit(): void {
    this.api.getGameTime().subscribe({
      next: (gt) => {
        this.gameTime = gt;
        this.form.start = gt.start ? gt.start.slice(0, 16) : '';
        this.form.end = gt.end ? gt.end.slice(0, 16) : '';
        this.form.services_public = gt.services_public;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  save(): void {
    this.saving = true;
    this.saved = false;
    this.api.setGameTime({
      start: this.form.start ? new Date(this.form.start).toISOString() : null,
      end: this.form.end ? new Date(this.form.end).toISOString() : null,
      services_public: this.form.services_public,
    }).subscribe({
      next: (gt) => {
        this.gameTime = gt;
        this.saving = false;
        this.saved = true;
        setTimeout(() => this.saved = false, 3000);
      },
      error: () => { this.saving = false; }
    });
  }
}
