import {
    AfterViewInit,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    OnDestroy,
    OnInit,
    ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { SentinelAuthService, UserRole } from '@sentinel/auth';
import { AgendaPortalLink } from '../../model/agenda-portal-link';
import { PortalAgendaContainer } from '../../model/portal-agenda-container';
import { RoleResolver } from '../../utils/role-resolver';
import { AgendaMenuItem } from '../../model/agenda-menu-item';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PortalAgendaContainerComponent } from './portal-agenda-container/portal-agenda-container.component';
import { ValidPath } from '@crczp/routing-commons';
import { catchError, of } from 'rxjs';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { LinearRunApi, LinearTrainingDefinitionApi, LinearTrainingInstanceApi, TrainingApiModule } from '@crczp/training-api';
import { AdaptiveTrainingDefinitionApi } from '@crczp/training-api';
import { PoolApi, ResourcesApi, SandboxApiModule } from '@crczp/sandbox-api';
import { GroupApi, UserApi, UserAndGroupApiModule } from '@crczp/user-and-group-api';
import { TrainingRunStateEnum } from '@crczp/training-model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export interface HardwareStats {
    cpuUsed: number | string;
    cpuTotal: number | string;
    ramUsed: number | string;
    ramTotal: number | string;
    activeSandboxes: number | string;
    maxSandboxes: number | string;
    cpuPercentage: number;
    ramPercentage: number;
    sandboxPercentage: number;
    ramUnits?: string;
}

@Component({
    selector: 'crczp-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    imports: [
        PortalAgendaContainerComponent,
        TrainingApiModule,
        SandboxApiModule,
        UserAndGroupApiModule,
    ],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('donutCanvas') donutCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('runsCanvas') runsCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('statusCanvas') statusCanvas!: ElementRef<HTMLCanvasElement>;

    elevated: string;
    roles: UserRole[];
    isAdmin = false;
    portalAgendaContainers: PortalAgendaContainer[] = [];

    totalRuns = 0;
    runningRuns = 0;
    finishedRuns = 0;
    archivedRuns = 0;
    linearDefs = 0;
    adaptiveDefs = 0;
    totalPools = 0;
    totalInstances = 0;
    totalGroups = 0;
    totalUsers = 0;

    hardwareStats: HardwareStats = {
        cpuUsed: '-', cpuTotal: '-',
        ramUsed: '-', ramTotal: '-',
        activeSandboxes: '-', maxSandboxes: '-',
        cpuPercentage: 0, ramPercentage: 0, sandboxPercentage: 0,
        ramUnits: 'GB',
    };

    private donutChart!: Chart;
    private barChart!: Chart;
    private runsChart!: Chart;
    private statusChart!: Chart;
    private chartsBuilt = false;

    private readonly runApi = inject(LinearRunApi);
    private readonly definitionApi = inject(LinearTrainingDefinitionApi);
    private readonly adaptiveDefApi = inject(AdaptiveTrainingDefinitionApi);
    private readonly instanceApi = inject(LinearTrainingInstanceApi);
    private readonly poolApi = inject(PoolApi);
    private readonly resourcesApi = inject(ResourcesApi);
    private readonly groupApi = inject(GroupApi);
    private readonly userApi = inject(UserApi);
    private readonly destroyRef = inject(DestroyRef);
    private readonly authService = inject(SentinelAuthService);
    private readonly router = inject(Router);

    static createExpandedControlButtons(path: ValidPath[]): AgendaMenuItem[] {
        return [
            new AgendaMenuItem('timeline', 'Adaptive', path[0]),
            new AgendaMenuItem('videogame_asset', 'Linear', path[1]),
        ];
    }

    ngOnInit(): void {
        this.roles = this.authService.getRoles();
        this.isAdmin = RoleResolver.isUserAndGroupAdmin(this.roles);
        this.initRoutes();
        this.subscribeUserChange();
        if (this.isAdmin) this.fetchAll();
    }

    ngAfterViewInit(): void {
        if (this.isAdmin && !this.chartsBuilt) this.buildCharts();
    }

    ngOnDestroy(): void {
        [this.donutChart, this.barChart, this.runsChart, this.statusChart]
            .forEach(c => c?.destroy());
    }

    navigateToRoute(route: ValidPath): void { this.router.navigate([route]); }
    setElevation(buttonName: string): void { this.elevated = buttonName; }

    formatRam(val: number | string, units = 'GB'): string {
        if (val === '-') return '-';
        return Number(val).toFixed(1) + ' ' + units;
    }

    private fetchAll(): void {
        const pg1 = { page: 0, size: 1, sortDir: 'asc', sortBy: '' } as unknown as OffsetPaginationEvent<any>;
        const pg1000 = { page: 0, size: 1000, sortDir: 'asc', sortBy: '' } as unknown as OffsetPaginationEvent<any>;

        if (this.runApi) {
            this.runApi.getAll(pg1000).pipe(catchError(() => of(null)))
                .subscribe(res => {
                    if (!res) return;
                    this.totalRuns = res.pagination.totalElements;
                    this.runningRuns = res.elements.filter(r => r.state === TrainingRunStateEnum.RUNNING).length;
                    this.finishedRuns = res.elements.filter(r => r.state === TrainingRunStateEnum.FINISHED).length;
                    this.archivedRuns = res.elements.filter(r => r.state === TrainingRunStateEnum.ARCHIVED).length;
                    this.updateChart('status');
                    this.updateChart('runs');
                });
        }

        if (this.definitionApi) {
            this.definitionApi.getAll(pg1).pipe(catchError(() => of(null)))
                .subscribe(res => {
                    if (res) { this.linearDefs = res.pagination.totalElements; this.updateChart('bar'); }
                });
        }

        if (this.adaptiveDefApi) {
            this.adaptiveDefApi.getAll(pg1).pipe(catchError(() => of(null)))
                .subscribe(res => {
                    if (res) { this.adaptiveDefs = res.pagination.totalElements; this.updateChart('bar'); }
                });
        }

        if (this.instanceApi) {
            this.instanceApi.getAll(pg1).pipe(catchError(() => of(null)))
                .subscribe(res => { if (res) this.totalInstances = res.pagination.totalElements; });
        }

        if (this.groupApi) {
            this.groupApi.getAll(pg1).pipe(catchError(() => of(null)))
                .subscribe(res => { if (res) this.totalGroups = res.pagination.totalElements; });
        }

        if (this.userApi) {
            this.userApi.getAll(pg1).pipe(catchError(() => of(null)))
                .subscribe(res => { if (res) this.totalUsers = res.pagination.totalElements; });
        }

        if (this.poolApi) {
            this.poolApi.getPools(pg1000).pipe(catchError(() => of(null)))
                .subscribe(res => {
                    if (!res) return;
                    this.totalPools = res.pagination.totalElements;
                    let used = 0, max = 0;
                    res.elements.forEach((p: any) => { used += p.usedSize || 0; max += p.maxSize || 0; });
                    this.hardwareStats.activeSandboxes = used;
                    this.hardwareStats.maxSandboxes = max;
                    this.hardwareStats.sandboxPercentage = max > 0 ? Math.round(used / max * 100) : 0;
                    this.updateChart('donut');
                });
        }

        if (this.resourcesApi) {
            this.resourcesApi.getResources().pipe(catchError(() => of(null)))
                .subscribe(res => {
                    if (!res?.quotas) return;
                    const q = res.quotas;
                    this.hardwareStats.cpuUsed = q.vcpu?.inUse ?? 0;
                    this.hardwareStats.cpuTotal = q.vcpu?.limit ?? 0;
                    this.hardwareStats.ramUsed = q.ram?.inUse ?? 0;
                    this.hardwareStats.ramTotal = q.ram?.limit ?? 0;
                    this.hardwareStats.ramUnits = 'GB';
                    const cpuT = Number(this.hardwareStats.cpuTotal);
                    const ramT = Number(this.hardwareStats.ramTotal);
                    this.hardwareStats.cpuPercentage = cpuT > 0 ? Math.round(Number(this.hardwareStats.cpuUsed) / cpuT * 100) : 0;
                    this.hardwareStats.ramPercentage = ramT > 0 ? Math.round(Number(this.hardwareStats.ramUsed) / ramT * 100) : 0;
                    this.updateChart('donut');
                });
        }
    }

    private buildCharts(): void {
        if (this.chartsBuilt) return;
        this.chartsBuilt = true;

        const ACC = '#e55a00';
        const BLUE = '#185fa5';
        const GRN = '#1d7a4a';
        const GRAY = '#e8e5e0';
        const TEXT = '#888';

        Chart.defaults.font.family = "'Space Grotesk', system-ui, sans-serif";
        Chart.defaults.font.size = 11;
        Chart.defaults.color = TEXT;

        if (this.donutCanvas) {
            this.donutChart = new Chart(this.donutCanvas.nativeElement, {
                type: 'doughnut',
                data: {
                    labels: ['CPU', 'RAM', 'Sandbox'],
                    datasets: [{ data: [0, 0, 0], backgroundColor: [ACC, BLUE, '#b06a00'], borderWidth: 0, hoverOffset: 4 }],
                },
                options: {
                    responsive: true, maintainAspectRatio: true, cutout: '68%',
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + c.parsed + '%' } },
                    },
                },
            });
        }

        if (this.barCanvas) {
            this.barChart = new Chart(this.barCanvas.nativeElement, {
                type: 'bar',
                data: {
                    labels: ['Linear', 'Adaptive'],
                    datasets: [{ label: 'Definitions', data: [0, 0], backgroundColor: [ACC, BLUE], borderRadius: 3, borderSkipped: false }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false } },
                        y: { grid: { color: '#f5f5f5' }, min: 0, ticks: { stepSize: 1 } },
                    },
                },
            });
        }

        if (this.runsCanvas) {
            this.runsChart = new Chart(this.runsCanvas.nativeElement, {
                type: 'bar',
                data: {
                    labels: ['Running', 'Finished', 'Archived'],
                    datasets: [{ label: 'Runs', data: [0, 0, 0], backgroundColor: [ACC, GRN, GRAY], borderRadius: 3, borderSkipped: false }],
                },
                options: {
                    indexAxis: 'y',
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: '#f5f5f5' }, min: 0, ticks: { stepSize: 1 } },
                        y: { grid: { display: false } },
                    },
                },
            });
        }

        if (this.statusCanvas) {
            this.statusChart = new Chart(this.statusCanvas.nativeElement, {
                type: 'pie',
                data: {
                    labels: ['Running', 'Finished', 'Archived'],
                    datasets: [{ data: [0, 0, 0], backgroundColor: [ACC, GRN, GRAY], borderWidth: 0, hoverOffset: 4 }],
                },
                options: {
                    responsive: true, maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, borderRadius: 2, padding: 10, font: { size: 10 } } },
                    },
                },
            });
        }
    }

    private updateChart(which: 'donut' | 'bar' | 'runs' | 'status'): void {
        if (!this.chartsBuilt) return;
        if (which === 'donut' && this.donutChart) {
            this.donutChart.data.datasets[0].data = [
                this.hardwareStats.cpuPercentage,
                this.hardwareStats.ramPercentage,
                this.hardwareStats.sandboxPercentage,
            ];
            this.donutChart.update();
        }
        if (which === 'bar' && this.barChart) {
            this.barChart.data.datasets[0].data = [this.linearDefs, this.adaptiveDefs];
            this.barChart.update();
        }
        if (which === 'runs' && this.runsChart) {
            this.runsChart.data.datasets[0].data = [this.runningRuns, this.finishedRuns, this.archivedRuns];
            this.runsChart.update();
        }
        if (which === 'status' && this.statusChart) {
            this.statusChart.data.datasets[0].data = [this.runningRuns, this.finishedRuns, this.archivedRuns];
            this.statusChart.update();
        }
    }

    private initRoutes() {
        this.portalAgendaContainers = [
            { agendas: this.createParticipateButtons(), label: 'Participate', displayed: RoleResolver.isTrainingTrainee(this.roles), children: [], icon: 'play_circle' },
            { agendas: this.createDesignButtons(), label: 'Design', displayed: RoleResolver.isTrainingDesigner(this.roles) || RoleResolver.isSandboxDesigner(this.roles), children: [], icon: 'design_services' },
            { agendas: this.createOrganizeButtons(), label: 'Organize', displayed: RoleResolver.isTrainingOrganizer(this.roles) || RoleResolver.isSandboxOrganizer(this.roles), children: [], icon: 'event' },
            { agendas: this.createManageButtons(), label: 'Manage', displayed: RoleResolver.isUserAndGroupAdmin(this.roles), children: [], icon: 'manage_accounts' },
        ];
    }

    private createParticipateButtons() {
        return [new AgendaPortalLink('Training Run', !RoleResolver.isTrainingTrainee(this.roles), 'run', 'Start or resume a training session or view results.', 'games')];
    }

    private createDesignButtons(): AgendaPortalLink[] {
        return [
            new AgendaPortalLink('Sandbox Definition', !RoleResolver.isSandboxDesigner(this.roles), 'sandbox-definition', 'Manage sandbox definitions.', 'event_note'),
            new AgendaPortalLink('Training Definition', !RoleResolver.isTrainingDesigner(this.roles), 'linear-definition', 'Blueprint for trainings.', 'assignment',
                HomeComponent.createExpandedControlButtons(['adaptive-definition', 'linear-definition'])),
        ];
    }

    private createOrganizeButtons() {
        return [
            new AgendaPortalLink('Pool', !RoleResolver.isSandboxOrganizer(this.roles), 'pool', 'Create pools of sandboxes.', 'subscriptions'),
            new AgendaPortalLink('Images', !RoleResolver.isSandboxOrganizer(this.roles), 'sandbox-image', 'View available cloud images.', 'donut_large'),
            new AgendaPortalLink('Training Instance', !RoleResolver.isTrainingOrganizer(this.roles), 'linear-instance', 'Create training instances.', 'event',
                HomeComponent.createExpandedControlButtons(['adaptive-instance', 'linear-instance'])),
        ];
    }

    private createManageButtons() {
        const d = !RoleResolver.isUserAndGroupAdmin(this.roles);
        return [
            new AgendaPortalLink('Groups', d, 'group', 'Manage groups and access rights.', 'group'),
            new AgendaPortalLink('Users', d, 'user', 'Assign users to groups.', 'person'),
            new AgendaPortalLink('Microservice', d, 'microservice', 'Manage platform microservices.', 'account_tree'),
        ];
    }

    private subscribeUserChange() {
        this.authService.activeUser$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.roles = this.authService.getRoles();
                this.isAdmin = RoleResolver.isUserAndGroupAdmin(this.roles);
                this.initRoutes();
            });
    }
}