import { AfterViewInit, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { SentinelAuthService } from '@sentinel/auth';
import { AgendaContainer } from '@sentinel/layout';
import { merge, Observable, of } from 'rxjs';
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

interface BreadcrumbItem {
    label: string;
    url: string;
}

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
        RouterLink,
        SentinelLayout1Component,
        ToolbarComponent,
    ],
})
export class AppComponent implements OnInit, AfterViewInit {
    title$: Observable<string>;
    subtitle$: Observable<string>;
    breadcrumbs$: Observable<BreadcrumbItem[]>;
    agendaContainers$: Observable<AgendaContainer[]>;
    notificationRoute: ValidPath = 'notifications';
    version = '';
    hideSidebar = signal<boolean>(false);
    /** Whether the nav sidebar is currently collapsed (hidden) */
    sidebarCollapsed = signal<boolean>(false);
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
        this.breadcrumbs$ = this.getBreadcrumbsFromRouter();
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

        // Auto-select first child when parent dropdown is expanded
        this.setupNestedNavAutoSelect();

        // Sync CSS variables with actual drawer width once rendered
        setTimeout(() => {
            const drawer = document.querySelector<HTMLElement>('.nav-drawer');
            if (drawer) {
                const w = drawer.offsetWidth;
                document.documentElement.style.setProperty('--sidebar-width', w + 'px');
                document.documentElement.style.setProperty('--content-margin-left', w + 'px');
            }
        }, 400);
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

            // ── Top-level nav buttons ──
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

            // Activate matching TOP-LEVEL buttons
            const sections = navDrawer.querySelectorAll<HTMLElement>('sentinel-root-agenda-container');
            sections.forEach((section) => {
                const sectionText = section.querySelector('.container')?.textContent?.trim().toLowerCase() ?? '';
                section.querySelectorAll<HTMLElement>('a.mdc-button, button.mdc-button').forEach((btn) => {
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

            // ── Child (nested) buttons ──
            // Map URL → which child label inside which parent dropdown should be active
            const childMap: Array<{ segment: string; parentLabel: string; childLabel: string }> = [
                { segment: 'adaptive-definition', parentLabel: 'definition', childLabel: 'adaptive' },
                { segment: 'linear-definition', parentLabel: 'definition', childLabel: 'linear' },
                { segment: 'adaptive-instance', parentLabel: 'instance', childLabel: 'adaptive' },
                { segment: 'linear-instance', parentLabel: 'instance', childLabel: 'linear' },
            ];

            // Find the best child match
            let bestChild: { parentLabel: string; childLabel: string } | null = null;
            let bestChildLen = 0;
            for (const { segment, parentLabel, childLabel } of childMap) {
                if (urlLower.includes(segment) && segment.length > bestChildLen) {
                    bestChild = { parentLabel, childLabel };
                    bestChildLen = segment.length;
                }
            }

            if (bestChild) {
                // Find all sentinel-nested-agenda-container elements
                navDrawer.querySelectorAll<HTMLElement>('sentinel-nested-agenda-container').forEach((container) => {
                    const parentBtn = container.querySelector<HTMLElement>('.nested-container button, .nested-container a');
                    if (!parentBtn) return;
                    const parentLabel = this.getButtonLabel(parentBtn.querySelector('.mdc-button__label'));
                    if (parentLabel !== bestChild!.parentLabel) return;

                    // Found the right container — mark the matching child button
                    const nestedDiv = container.querySelector<HTMLElement>('.nested');
                    if (!nestedDiv) return;

                    nestedDiv.querySelectorAll<HTMLElement>('a.mdc-button, button.mdc-button').forEach((childBtn) => {
                        const childLabel = this.getButtonLabel(childBtn.querySelector('.mdc-button__label'));
                        if (childLabel === bestChild!.childLabel) {
                            childBtn.classList.add('fctf-active');
                        }
                    });
                });
            }
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
     * Injects Material Icon spans before each nav button label.
     * Retries at multiple fixed delays + uses MutationObserver to handle:
     *  - async auth/agenda rendering
     *  - newly expanded nested items (Adaptive/Linear)
     */
    private injectNavIcons(): void {
        const iconMap: Record<string, string> = {
            'definition': 'description',
            'adaptive': 'auto_awesome',
            'linear': 'linear_scale',
            'instance': 'play_circle_outline',
            'run': 'directions_run',
            'pool': 'storage',
            'images': 'photo_library',
            'user': 'person',
            'group': 'group',
            'microservice': 'settings',
        };

        const doInject = (): void => {
            const navDrawer = document.querySelector('.nav-drawer');
            if (!navDrawer) return;

            // Support both Angular Material class conventions
            const buttons = navDrawer.querySelectorAll<HTMLElement>(
                'sentinel-root-agenda-container a[mat-button],' +
                'sentinel-root-agenda-container button[mat-button],' +
                'sentinel-root-agenda-container a.mdc-button,' +
                'sentinel-root-agenda-container button.mdc-button'
            );

            buttons.forEach((btn) => {
                if (btn.querySelector('.fctf-nav-icon')) return;

                // Try .mdc-button__label; fall back to stripping mat-icon text
                const labelEl = btn.querySelector('.mdc-button__label');
                let label: string;
                if (labelEl) {
                    label = this.getButtonLabel(labelEl);
                } else {
                    const clone = btn.cloneNode(true) as HTMLElement;
                    clone.querySelectorAll('mat-icon, .mat-icon').forEach((el) => el.remove());
                    label = clone.textContent?.trim().toLowerCase() ?? '';
                }

                const iconName = iconMap[label];
                if (!iconName) return;

                const iconSpan = document.createElement('span');
                iconSpan.className = 'fctf-nav-icon material-icons';
                iconSpan.textContent = iconName;
                iconSpan.setAttribute('aria-hidden', 'true');

                if (labelEl) {
                    btn.insertBefore(iconSpan, labelEl);
                } else {
                    btn.prepend(iconSpan);
                }
            });
        };

        // Fixed-delay retries handle async agenda/auth rendering
        [100, 400, 900, 1800, 4000].forEach((delay) => setTimeout(doInject, delay));

        // MutationObserver handles expand/collapse revealing new buttons
        let observerAttached = false;
        const tryAttachObserver = (): void => {
            const navDrawer = document.querySelector('.nav-drawer');
            if (navDrawer && !observerAttached) {
                const observer = new MutationObserver(doInject);
                observer.observe(navDrawer, { childList: true, subtree: true });
                observerAttached = true;
            }
        };
        [50, 200, 600, 1200].forEach((delay) => setTimeout(tryAttachObserver, delay));
    }

    /**
     * Sets up auto-navigation to the first child button when a parent
     * dropdown (Definition / Instance / Sandbox Definition) is expanded.
     * Also keeps the parent highlighted whenever a child is the active route.
     */
    private setupNestedNavAutoSelect(): void {
        const attachListeners = (): void => {
            const navDrawer = document.querySelector('.nav-drawer');
            if (!navDrawer) return;

            const containers = navDrawer.querySelectorAll<HTMLElement>('sentinel-nested-agenda-container');
            containers.forEach((container) => {
                const parentBtn = container.querySelector<HTMLElement>(
                    '.nested-container > button, .nested-container > a'
                );
                if (!parentBtn || (parentBtn as any).__fctfListenerAttached) return;
                (parentBtn as any).__fctfListenerAttached = true;

                parentBtn.addEventListener('click', () => {
                    // Wait for the .nested div to appear (Sentinel toggles it)
                    setTimeout(() => {
                        const nestedDiv = container.querySelector<HTMLElement>('.nested');
                        if (!nestedDiv) return; // was collapsed, nothing to do

                        // Find the first child button that is NOT already active
                        const firstChild = nestedDiv.querySelector<HTMLElement>(
                            'a.mdc-button, button.mdc-button'
                        );
                        if (firstChild && !firstChild.classList.contains('fctf-active')) {
                            firstChild.click();
                        }
                    }, 80);
                });
            });
        };

        // Retry attaching because nav renders asynchronously
        [300, 800, 1500, 3000].forEach((d) => setTimeout(attachListeners, d));

        // Also re-attach whenever the nav DOM changes (new containers appear)
        let listenerObserverAttached = false;
        const tryAttachListenerObserver = (): void => {
            const navDrawer = document.querySelector('.nav-drawer');
            if (navDrawer && !listenerObserverAttached) {
                listenerObserverAttached = true;
                new MutationObserver(() => attachListeners()).observe(
                    navDrawer, { childList: true, subtree: true }
                );
            }
        };
        [200, 600, 1200].forEach((d) => setTimeout(tryAttachListenerObserver, d));
    }

    /**
     * Collapses or expands the sidebar by toggling .nav-drawer visibility.
     * The Sentinel layout does not expose a collapse API, so we manipulate the DOM directly.
     */
    toggleSidebar(): void {
        this.sidebarCollapsed.update(v => !v);

        // Sentinel layout1 uses mat-drawer; margin is controlled via --content-margin-left CSS var
        const drawer = document.querySelector<HTMLElement>('.nav-drawer');
        const T = 'all 0.25s ease';

        if (this.sidebarCollapsed()) {
            const naturalW = drawer ? drawer.offsetWidth : 220;
            if (drawer) {
                (drawer as any).__naturalWidth = naturalW;
                drawer.style.transition = T;
                drawer.style.width = '0';
                drawer.style.minWidth = '0';
                drawer.style.overflow = 'hidden';
                drawer.style.visibility = 'hidden';
            }
            document.documentElement.style.setProperty('--content-margin-left', '0px');
        } else {
            const naturalW = (drawer as any)?.__naturalWidth ?? 220;
            if (drawer) {
                drawer.style.transition = T;
                drawer.style.visibility = '';
                drawer.style.overflow = '';
                drawer.style.minWidth = '';
                drawer.style.width = naturalW + 'px';
            }
            document.documentElement.style.setProperty('--content-margin-left', naturalW + 'px');

            setTimeout(() => {
                if (drawer) drawer.style.width = '';
            }, 300);
        }
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

    private getBreadcrumbsFromRouter(): Observable<BreadcrumbItem[]> {
        return merge(
            of(null),
            this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
        ).pipe(
            map(() => {
                const crumbs: BreadcrumbItem[] = [];
                let url = '';
                const traverse = (route: ActivatedRoute): void => {
                    if (route.snapshot.url.length > 0) {
                        url += '/' + route.snapshot.url.map((seg) => seg.path).join('/');
                    }
                    // Use routeConfig.data (own data only) to avoid inheriting parent breadcrumbs
                    const label = route.snapshot.routeConfig?.data?.['breadcrumb'] as string | undefined;
                    if (label) {
                        crumbs.push({ label, url });
                    }
                    if (route.firstChild?.outlet === 'primary') {
                        traverse(route.firstChild);
                    }
                };
                if (this.activatedRoute.root.firstChild) {
                    traverse(this.activatedRoute.root.firstChild);
                }
                return crumbs;
            }),
        );
    }
}