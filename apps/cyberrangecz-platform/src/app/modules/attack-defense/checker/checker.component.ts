import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttackDefenseApiService } from '../services/attack-defense-api.service';
import { CheckerInfo, CheckerScript } from '../models';

@Component({
  selector: 'app-checker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ad-page">
      <div class="ad-header">
        <h2>Checker Editor</h2>
        <p class="subtitle">Xem và chỉnh sửa checker script cho từng service</p>
      </div>

      <div class="checker-layout">
        <!-- Service list -->
        <div class="service-list">
          <div class="list-header">Services</div>
          <div
            *ngFor="let svc of services"
            class="service-item"
            [class.active]="selectedService?.id === svc.id"
            (click)="selectService(svc)">
            <span class="svc-name">{{ svc.name }}</span>
            <span [class]="svc.checker_enabled ? 'dot dot-ok' : 'dot dot-off'"></span>
          </div>
          <div class="empty-list" *ngIf="services.length === 0 && !loadingList">
            Chưa có service nào.
          </div>
          <div class="loading" *ngIf="loadingList">Đang tải...</div>
        </div>

        <!-- Editor -->
        <div class="editor-panel">
          <div class="editor-toolbar" *ngIf="selectedService">
            <span class="svc-title">{{ selectedService.name }}</span>
            <span class="script-path">{{ script?.script_path }}</span>
            <button class="btn btn-primary" (click)="saveScript()" [disabled]="saving">
              {{ saving ? 'Đang lưu...' : '💾 Lưu' }}
            </button>
            <span class="success-msg" *ngIf="saved">✓ Đã lưu</span>
          </div>

          <textarea
            class="code-editor"
            [(ngModel)]="editorContent"
            [placeholder]="selectedService ? 'Đang tải script...' : 'Chọn một service để chỉnh sửa checker script'"
            [disabled]="!selectedService || loadingScript">
          </textarea>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ad-page { padding: 24px; height: calc(100vh - 120px); display: flex; flex-direction: column; }
    .ad-header { margin-bottom: 16px; flex-shrink: 0; }
    .ad-header h2 { color: #e05f00; font-size: 1.5rem; margin: 0 0 4px; }
    .subtitle { color: #666; margin: 0; font-size: 0.9rem; }
    .checker-layout { display: flex; gap: 16px; flex: 1; min-height: 0; }
    .service-list { width: 200px; background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.1); overflow-y: auto; flex-shrink: 0; }
    .list-header { padding: 12px 16px; font-weight: 600; font-size: 0.85rem; color: #888; text-transform: uppercase; border-bottom: 1px solid #f0f0f0; }
    .service-item { padding: 12px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f8f8f8; }
    .service-item:hover { background: #fafafa; }
    .service-item.active { background: #fff3e0; border-left: 3px solid #e05f00; }
    .svc-name { font-size: 0.9rem; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot-ok { background: #4caf50; }
    .dot-off { background: #f44336; }
    .editor-panel { flex: 1; background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.1); display: flex; flex-direction: column; min-width: 0; }
    .editor-toolbar { padding: 12px 16px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .svc-title { font-weight: 600; color: #e05f00; }
    .script-path { color: #888; font-size: 0.8rem; font-family: monospace; flex: 1; }
    .btn { padding: 6px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500; }
    .btn-primary { background: #e05f00; color: #fff; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .success-msg { color: #2e7d32; font-size: 0.85rem; }
    .code-editor { flex: 1; width: 100%; border: none; resize: none; padding: 16px; font-family: 'Courier New', monospace; font-size: 0.9rem; line-height: 1.6; background: #1e1e1e; color: #d4d4d4; border-radius: 0 0 8px 8px; box-sizing: border-box; }
    .code-editor:focus { outline: none; }
    .code-editor:disabled { opacity: 0.5; }
    .empty-list, .loading { padding: 20px 16px; color: #999; font-size: 0.85rem; text-align: center; }
  `]
})
export class CheckerComponent implements OnInit {
  services: CheckerInfo[] = [];
  selectedService: CheckerInfo | null = null;
  script: CheckerScript | null = null;
  editorContent = '';
  loadingList = true;
  loadingScript = false;
  saving = false;
  saved = false;

  constructor(private api: AttackDefenseApiService) {}

  ngOnInit(): void {
    this.api.getCheckers().subscribe({
      next: (res) => {
        this.services = res.checkers;
        this.loadingList = false;
        if (this.services.length > 0) {
          this.selectService(this.services[0]);
        }
      },
      error: () => { this.loadingList = false; }
    });
  }

  selectService(svc: CheckerInfo): void {
    this.selectedService = svc;
    this.loadingScript = true;
    this.editorContent = '';
    this.api.getCheckerScript(svc.id).subscribe({
      next: (s) => {
        this.script = s;
        this.editorContent = s.content;
        this.loadingScript = false;
      },
      error: () => { this.loadingScript = false; }
    });
  }

  saveScript(): void {
    if (!this.selectedService) return;
    this.saving = true;
    this.saved = false;
    this.api.saveCheckerScript(this.selectedService.id, this.editorContent).subscribe({
      next: () => {
        this.saving = false;
        this.saved = true;
        setTimeout(() => this.saved = false, 3000);
      },
      error: () => { this.saving = false; }
    });
  }
}
