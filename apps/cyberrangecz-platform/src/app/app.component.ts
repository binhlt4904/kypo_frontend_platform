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

        // Inject nav icons once after nav renders
        this.injectNavIcons();
    }

    /**
     * Marks the nav button matching the current route as fctf-active.
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

            const urlLower = currentUrl.toLowerCase().split('?')[0];

            // Map URL segments → { section, label } to activate
            const segmentMap: Array<{ segment: string; items: Array<{ section: string; label: string }> }> = [
                { segment: 'adaptive-definition', items: [{ section: 'trainings', label: 'definition' }] },
                { segment: 'linear-definition', items: [{ section: 'trainings', label: 'definition' }] },
                { segment: 'adaptive-instance', items: [{ section: 'trainings', label: 'instance' }] },
                { segment: 'linear-instance', items: [{ section: 'trainings', label: 'instance' }] },
                { segment: 'run', items: [{ section: 'trainings', label: 'run' }] },
                { segment: 'sandbox-definition', items: [{ section: 'sandboxes', label: 'definition' }] },
                { segment: 'pool', items: [{ section: 'sandboxes', label: 'pool' }] },
                { segment: 'sandbox-image', items: [{ section: 'sandboxes', label: 'images' }] },
                { segment: 'user', items: [{ section: 'administration', label: 'user' }] },
                { segment: 'group', items: [{ section: 'administration', label: 'group' }] },
                { segment: 'microservice', items: [{ section: 'administration', label: 'microservice' }] },
            ];

            // Find best match (longest segment wins)
            let matchedItems: Array<{ section: string; label: string }> = [];
            let bestLen = 0;
            for (const { segment, items } of segmentMap) {
                if (urlLower.includes(segment) && segment.length > bestLen) {
                    matchedItems = items;
                    bestLen = segment.length;
                }
            }

            if (!matchedItems.length) return;

            // For each section in nav, find and activate matching buttons
            const sections = navDrawer.querySelectorAll<HTMLElement>('sentinel-root-agenda-container');
            sections.forEach((section) => {
                const sectionText = section.querySelector('.container')?.textContent?.trim().toLowerCase() ?? '';
                section.querySelectorAll<HTMLElement>('a.mdc-button, button.mdc-button').forEach((btn) => {
                    // Read only direct text nodes inside .mdc-button__label (exclude injected icon text)
                    const labelEl = btn.querySelector('.mdc-button__label');
                    const label = this.getButtonLabel(labelEl);
                    const shouldActivate = matchedItems.some(
                        item => sectionText.includes(item.section) && label === item.label
                    );
                    if (shouldActivate) {
                        btn.classList.add('fctf-active');
                    }
                });
            });
        }, 150);
    }

    /**
     * Extracts button label text while ignoring injected icon spans and mat-icon content.
     */
    private getButtonLabel(labelEl: Element | null): string {
        if (!labelEl) return '';
        // Collect only text nodes (skip child elements like mat-icon and .fctf-nav-icon)
        let text = '';
        labelEl.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent ?? '';
            }
        });
        return text.trim().toLowerCase();
    }

    /**
     * Injects Material Icon spans before the label of each nav button.
     * Called once after the nav is rendered. Safe to call multiple times
     * (skips buttons that already have an icon).
     */
    private injectNavIcons(): void {
        // Map nav item label (lowercase) → Material Icon name
        const iconMap: Record<string, string> = {
            'definition':   'description',
            'adaptive':     'auto_awesome',
            'linear':       'linear_scale',
            'instance':     'play_circle_outline',
            'run':          'directions_run',
            'pool':         'storage',
            'images':       'photo_library',
            'user':         'person',
            'group':        'group',
            'microservice': 'settings',
        };

        setTimeout(() => {
            const navDrawer = document.querySelector('.nav-drawer');
            if (!navDrawer) return;

            navDrawer.querySelectorAll<HTMLElement>('a.mdc-button, button.mdc-button').forEach((btn) => {
                // Skip if icon already injected
                if (btn.querySelector('.fctf-nav-icon')) return;

                const labelEl = btn.querySelector('.mdc-button__label');
                if (!labelEl) return;

                const label = this.getButtonLabel(labelEl);
                const iconName = iconMap[label];
                if (!iconName) return;

                // Create and insert icon span before the label element
                const iconSpan = document.createElement('span');
                iconSpan.className = 'fctf-nav-icon material-icons';
                iconSpan.textContent = iconName;
                iconSpan.setAttribute('aria-hidden', 'true');
                btn.insertBefore(iconSpan, labelEl);
            });
        }, 400);
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