import { AfterViewInit, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SentinelAuthService } from '@sentinel/auth';
import { AgendaContainer } from '@sentinel/layout';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { NavConfigFactory } from './utils/nav-config-factory';
import { PortalDynamicEnvironment } from './portal-dynamic-environment';

// eslint-disable-next-line @nx/enforce-module-boundaries
import packagejson from '../../../../package.json';
import { LoadingService } from './services/loading.service';
import { ValidPath } from '@crczp/routing-commons';
import { Utils } from '@crczp/utils';
import { CommonModule } from '@angular/common';
import { SentinelLayout1Component } from '@sentinel/layout/layout1';
import { ToolbarComponent } from '@sentinel/layout/common-components';

/**
 * Main component serving as wrapper for layout and router outlet
 */
@Component({
    selector: 'crczp-app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterOutlet,
        SentinelLayout1Component,
        ToolbarComponent,
    ],
})
export class AppComponent implements OnInit, AfterViewInit {
    title$: Observable<string>;
    subtitle$: Observable<string>;
    agendaContainers$: Observable<AgendaContainer[]>;
    notificationRoute: ValidPath = 'notifications';
    version = '';
    hideSidebar = signal<boolean>(false);
    protected readonly loadingService = inject(LoadingService);
    protected readonly authService = inject(SentinelAuthService);
    private readonly router = inject(Router);
    private readonly activatedRoute = inject(ActivatedRoute);

    constructor() {
        this.activatedRoute.queryParams.subscribe((params) => {
            this.hideSidebar.set(params['hideSidebar'] === 'true');
        });
    }

    ngOnInit(): void {
        this.title$ = this.getTitleFromRouter();
        this.subtitle$ = this.getSubtitleFromRouter();
        this.agendaContainers$ = this.authService.activeUser$.pipe(
            filter((user) => user != null),
            map((user) =>
                Utils.NavBar.buildNav(NavConfigFactory.buildNavConfig(user)),
            ),
        );

        this.version =
            PortalDynamicEnvironment.getConfig().version || packagejson.version;
    }

    ngAfterViewInit(): void {
        this.router.events
            .pipe(filter((event) => event instanceof NavigationEnd))
            .subscribe((event: NavigationEnd) => {
                this.updateActiveNavItem(event.urlAfterRedirects);
            });

        // Apply on initial load
        this.updateActiveNavItem(this.router.url);
    }

    /**
     * Marks the nav button matching the current route as fctf-active.
     * Also highlights the parent label (e.g. Definition/Instance) when a
     * child route (Adaptive/Linear) is active, so the user always sees
     * both the parent and the specific child highlighted.
     * @sentinel/layout does not expose an active class, so we inject it manually.
     */
    private updateActiveNavItem(currentUrl: string): void {
        setTimeout(() => {
            const navDrawer = document.querySelector('.nav-drawer');
            if (!navDrawer) return;

            // Remove all existing active marks
            navDrawer.querySelectorAll('.fctf-active').forEach((el) => {
                el.classList.remove('fctf-active');
            });
            navDrawer.querySelectorAll('.fctf-parent-active').forEach((el) => {
                el.classList.remove('fctf-parent-active');
            });

            const urlLower = currentUrl.toLowerCase().split('?')[0];

            /**
             * segmentMap: each entry defines which nav items to activate.
             *  - parentLabel: the parent button to highlight (e.g. 'definition')
             *  - childLabel:  the specific child button to highlight (e.g. 'adaptive')
             *                 undefined = no child, only highlight parent
             */
            const segmentMap: Array<{
                segment: string;
                section: string;
                parentLabel: string;
                childLabel?: string;
            }> = [
                { segment: 'adaptive-definition',  section: 'trainings',      parentLabel: 'definition', childLabel: 'adaptive' },
                { segment: 'linear-definition',    section: 'trainings',      parentLabel: 'definition', childLabel: 'linear' },
                { segment: 'adaptive-instance',    section: 'trainings',      parentLabel: 'instance',   childLabel: 'adaptive' },
                { segment: 'linear-instance',      section: 'trainings',      parentLabel: 'instance',   childLabel: 'linear' },
                { segment: 'run',                  section: 'trainings',      parentLabel: 'run' },
                { segment: 'sandbox-definition',   section: 'sandboxes',      parentLabel: 'definition' },
                { segment: 'pool',                 section: 'sandboxes',      parentLabel: 'pool' },
                { segment: 'sandbox-image',        section: 'sandboxes',      parentLabel: 'images' },
                { segment: 'user',                 section: 'administration', parentLabel: 'user' },
                { segment: 'group',                section: 'administration', parentLabel: 'group' },
                { segment: 'microservice',         section: 'administration', parentLabel: 'microservice' },
            ];

            // Find best match (longest segment wins)
            let matched: typeof segmentMap[0] | null = null;
            let bestLen = 0;
            for (const entry of segmentMap) {
                if (urlLower.includes(entry.segment) && entry.segment.length > bestLen) {
                    matched = entry;
                    bestLen = entry.segment.length;
                }
            }

            if (!matched) return;

            const { section, parentLabel, childLabel } = matched;

            // Walk all sentinel sections and activate the right buttons
            const sections = navDrawer.querySelectorAll<HTMLElement>('sentinel-root-agenda-container');
            sections.forEach((sectionEl) => {
                const sectionText = sectionEl.querySelector('.container')?.textContent?.trim().toLowerCase() ?? '';
                if (!sectionText.includes(section)) return;

                sectionEl.querySelectorAll<HTMLElement>('a.mdc-button, button.mdc-button').forEach((btn) => {
                    const label = btn.querySelector('.mdc-button__label')?.textContent?.trim().toLowerCase() ?? '';

                    // Always highlight the parent (e.g. 'definition', 'instance')
                    if (label === parentLabel) {
                        btn.classList.add('fctf-active');
                    }

                    // Also highlight the child (e.g. 'adaptive', 'linear') if defined
                    if (childLabel && label === childLabel) {
                        btn.classList.add('fctf-active');
                    }
                });
            });
        }, 150);
    }

    onLogin(): void {
        this.authService.login();
    }

    onLogout(): void {
        this.authService.logout();
    }

    private getTitleFromRouter(): Observable<string> {
        return this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            map(() => {
                let route = this.activatedRoute;
                while (route.firstChild) {
                    route = route.firstChild;
                }
                return route;
            }),
            filter((route) => route.outlet === 'primary'),
            map((route) => route.snapshot),
            map((snapshot) => snapshot.data['title']),
        );
    }

    private getSubtitleFromRouter(): Observable<string> {
        return this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            map(() => {
                let route = this.activatedRoute;
                while (route.firstChild) {
                    route = route.firstChild;
                }
                return route;
            }),
            filter((route) => route.outlet === 'primary'),
            map((route) => route.snapshot),
            map((snapshot) => snapshot.data['subtitle']),
        );
    }
}