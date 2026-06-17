import { Component, DestroyRef, inject, OnInit } from '@angular/core';
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

import { LinearRunApi, LinearTrainingDefinitionApi, LinearTrainingInstanceApi } from '@crczp/training-api';
import { PoolApi, ResourcesApi } from '@crczp/sandbox-api';
import { GroupApi, UserApi, MicroserviceApi } from '@crczp/user-and-group-api';

export interface ResourceStats {
    trainingRuns: number | string;
    definitions: number | string;
    pools: number | string;
    instances: number | string;
    groups: number | string;
    users: number | string;
}

export interface HardwareStats {
    cpuUsed: number | string;
    cpuTotal: number | string;
    ramUsed: number | string;
    ramTotal: number | string;
    activeSandboxes: number | string;
    maxSandboxes: number | string;
    cpuPercentage: number;
    ramPercentage: number;
}

/**
 * Main component of homepage (portal) page. Portal page is a main crossroad of possible sub pages. Only those matching with user
 * role are accessible.
 */
@Component({
    selector: 'crczp-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    imports: [PortalAgendaContainerComponent],
    providers: [
        LinearRunApi,
        LinearTrainingDefinitionApi,
        LinearTrainingInstanceApi,
        PoolApi,
        ResourcesApi,
        GroupApi,
        UserApi,
        MicroserviceApi
    ]
})
export class HomeComponent implements OnInit {
    elevated: string;
    roles: UserRole[];
    portalAgendaContainers: PortalAgendaContainer[] = [];

    stats: ResourceStats = {
        trainingRuns: '-',
        definitions: '-',
        pools: '-',
        instances: '-',
        groups: '-',
        users: '-'
    };

    hardwareStats: HardwareStats = {
        cpuUsed: '-', cpuTotal: '-',
        ramUsed: '-', ramTotal: '-',
        activeSandboxes: '-', maxSandboxes: '-',
        cpuPercentage: 0, ramPercentage: 0
    };

    private runApi = inject(LinearRunApi);
    private definitionApi = inject(LinearTrainingDefinitionApi);
    private instanceApi = inject(LinearTrainingInstanceApi);
    private poolApi = inject(PoolApi);
    private resourcesApi = inject(ResourcesApi);
    private groupApi = inject(GroupApi);
    private userApi = inject(UserApi);

    destroyRef = inject(DestroyRef);

    private authService = inject(SentinelAuthService);
    private router = inject(Router);

    static createExpandedControlButtons(path: ValidPath[]): AgendaMenuItem[] {
        return [
            new AgendaMenuItem('timeline', 'Adaptive', path[0]),
            new AgendaMenuItem('videogame_asset', 'Linear', path[1]),
        ];
    }

    ngOnInit(): void {
        this.roles = this.authService.getRoles();
        this.initRoutes();
        this.subscribeUserChange();
        this.fetchStats();
    }

    /**
     * Navigates to specified route
     * @param route route to which should router navigate
     */
    navigateToRoute(route: ValidPath): void {
        this.router.navigate([route]);
    }

    setElevation(buttonName: string): void {
        this.elevated = buttonName;
    }

    private initRoutes() {
        this.portalAgendaContainers = [
            {
                agendas: this.createParticipateButtons(),
                label: 'Participate',
                displayed: RoleResolver.isTrainingTrainee(this.roles),
                children: [],
                icon: 'play_circle',
            },
            {
                agendas: this.createDesignButtons(),
                label: 'Design',
                displayed:
                    RoleResolver.isTrainingDesigner(this.roles) ||
                    RoleResolver.isSandboxDesigner(this.roles),
                children: [],
                icon: 'design_services',
            },
            {
                agendas: this.createOrganizeButtons(),
                label: 'Organize',
                displayed:
                    RoleResolver.isTrainingOrganizer(this.roles) ||
                    RoleResolver.isSandboxOrganizer(this.roles),
                children: [],
                icon: 'event',
            },
            {
                agendas: this.createManageButtons(),
                label: 'Manage',
                displayed: RoleResolver.isUserAndGroupAdmin(this.roles),
                children: [],
                icon: 'manage_accounts',
            },
        ];
    }

    private createParticipateButtons() {
        return [
            new AgendaPortalLink(
                'Training Run',
                !RoleResolver.isTrainingTrainee(this.roles),
                'run',
                'Training Run lets you start or resume a training session or view the results of a completed training.',
                'games',
            ),
        ];
    }

    private createDesignButtons(): AgendaPortalLink[] {
        return [
            new AgendaPortalLink(
                'Sandbox Definition',
                !RoleResolver.isSandboxDesigner(this.roles),
                'sandbox-definition',
                'In the Sandbox Definition agenda, you can manage sandbox definitions—descriptions of virtual networks and computers that can be instantiated in isolated sandboxes.',
                'event_note',
            ),
            new AgendaPortalLink(
                'Training Definition',
                !RoleResolver.isTrainingDesigner(this.roles),
                'linear-definition',
                'Training Definition is the blueprint for trainings. You can manage existing trainings and design new ones.',
                'assignment',
                HomeComponent.createExpandedControlButtons([
                    'adaptive-definition',
                    'linear-definition',
                ]),
            ),
        ];
    }

    private createOrganizeButtons() {
        return [
            new AgendaPortalLink(
                'Pool',
                !RoleResolver.isSandboxOrganizer(this.roles),
                'pool',
                'As an instructor, you can create pools of sandboxes—the basic organizational units for instantiating sandbox definitions.',
                'subscriptions',
            ),
            new AgendaPortalLink(
                'Images',
                !RoleResolver.isSandboxOrganizer(this.roles),
                'sandbox-image',
                'In the Images agenda, you can view available cloud images.',
                'donut_large',
            ),
            new AgendaPortalLink(
                'Training Instance',
                !RoleResolver.isTrainingOrganizer(this.roles),
                'linear-instance',
                'You can create training instances required for organizing hands-on training sessions.',
                'event',
                HomeComponent.createExpandedControlButtons([
                    'adaptive-instance',
                    'linear-instance',
                ]),
            ),
        ];
    }

    private createManageButtons() {
            const disabled = !RoleResolver.isUserAndGroupAdmin(this.roles);
            return [
                new AgendaPortalLink(
                    'Groups',
                    disabled,
                    'group',
                    'In Groups, you can manage groups and grant access rights to their members.',
                    'group',
                ),
                new AgendaPortalLink(
                    'Users',
                    disabled,
                    'user',
                    'The Users agenda lets you assign users to existing groups.',
                    'person',
                ),
                new AgendaPortalLink(
                    'Microservice',
                    disabled,
                    'microservice',
                    'You can also manage the microservices that provide the CyberRangeᶜᶻ Platform\'s functionality. Make sure you understand the implications before making any changes.',
                    'account_tree',
                ),
            ];
        }


    private createPlatformToolsButtons() {
        return [];
    }

    private subscribeUserChange() {
        this.authService.activeUser$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.initRoutes();
            });
    }

    private fetchStats() {
        // Fetch only 1 element to efficiently retrieve total counts via pagination headers
        const pagination = { page: 0, size: 1, sortDir: 'asc', sortBy: '' } as unknown as OffsetPaginationEvent<any>;

        if (this.runApi) {
            this.runApi.getAll(pagination).pipe(catchError(() => of(null)))
                .subscribe(res => { if (res) this.stats.trainingRuns = res.pagination.totalElements; });
        }

        if (this.definitionApi) {
            this.definitionApi.getAll(pagination).pipe(catchError(() => of(null)))
                .subscribe(res => { if (res) this.stats.definitions = res.pagination.totalElements; });
        }

        if (this.instanceApi) {
            this.instanceApi.getAll(pagination).pipe(catchError(() => of(null)))
                .subscribe(res => { if (res) this.stats.instances = res.pagination.totalElements; });
        }

        if (this.groupApi) {
            this.groupApi.getAll(pagination).pipe(catchError(() => of(null)))
                .subscribe(res => { if (res) this.stats.groups = res.pagination.totalElements; });
        }

        if (this.userApi) {
            this.userApi.getAll(pagination).pipe(catchError(() => of(null)))
                .subscribe(res => { if (res) this.stats.users = res.pagination.totalElements; });
        }

        if (this.resourcesApi) {
            this.resourcesApi.getLimits().pipe(catchError(() => of(null)))
                .subscribe(limits => {
                    if (limits) {
                        this.hardwareStats.cpuTotal = limits.vcpu || 0;
                        this.hardwareStats.ramTotal = limits.ram || 0;
                        this.updatePercentages();
                    }
                });
        }

        if (this.poolApi) {
            const largePagination = { page: 0, size: 1000, sortDir: 'asc', sortBy: '' } as unknown as OffsetPaginationEvent<any>;
            this.poolApi.getPools(largePagination).pipe(catchError(() => of(null)))
                .subscribe(res => {
                    if (res && res.elements) {
                        this.stats.pools = res.pagination.totalElements;

                        let cpuUsed = 0;
                        let ramUsed = 0;
                        let activeSandboxes = 0;
                        let maxSandboxes = 0;

                        res.elements.forEach((pool: any) => {
                            if (pool.hardwareUsage) {
                                cpuUsed += pool.hardwareUsage.vcpu || 0;
                                ramUsed += pool.hardwareUsage.ram || 0;
                            }
                            activeSandboxes += pool.usedSize || 0;
                            maxSandboxes += pool.maxSize || 0;
                        });

                        this.hardwareStats.cpuUsed = cpuUsed;
                        this.hardwareStats.ramUsed = ramUsed;
                        this.hardwareStats.activeSandboxes = activeSandboxes;
                        this.hardwareStats.maxSandboxes = maxSandboxes;
                        this.updatePercentages();
                    }
                });
        }
    }

    private updatePercentages() {
        if (typeof this.hardwareStats.cpuUsed === 'number' && typeof this.hardwareStats.cpuTotal === 'number' && this.hardwareStats.cpuTotal > 0) {
            this.hardwareStats.cpuPercentage = Math.round((this.hardwareStats.cpuUsed / this.hardwareStats.cpuTotal) * 100);
        }
        if (typeof this.hardwareStats.ramUsed === 'number' && typeof this.hardwareStats.ramTotal === 'number' && this.hardwareStats.ramTotal > 0) {
            this.hardwareStats.ramPercentage = Math.round((this.hardwareStats.ramUsed / this.hardwareStats.ramTotal) * 100);
        }
    }

    formatRam(ramInMb: number | string): string {
        if (ramInMb === '-') return '-';
        const num = Number(ramInMb);
        return (num / 1024).toFixed(1) + ' GB';
    }
}
