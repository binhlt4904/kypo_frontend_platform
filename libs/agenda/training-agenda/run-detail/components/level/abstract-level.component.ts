import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    HostListener,
    inject,
    OnDestroy,
    OnInit,
    signal,
    ViewChild,
} from '@angular/core';
import { AbstractLevelTypeEnum, AbstractPhaseTypeEnum, AccessTrainingRunInfo } from '@crczp/training-model';
import { TrainingTimerComponent } from './training-timer/training-timer.component';
import { MatTooltip } from '@angular/material/tooltip';
import { AbstractTrainingRunService } from '../../services/training-run/abstract-training-run.service';
import { AsyncPipe } from '@angular/common';
import '@crczp/mixins';
import { InfoLevelComponent } from './info-level/info-level.component';
import { LinearTrainingLevelComponent } from './training-level/linear-training-level.component';
import { AdaptiveTrainingLevelComponent } from './training-level/adaptive-training-level.component';
import { AssessmentLevelComponent } from './assessment-level/assessment-level.component';
import { QuestionnaireLevelComponent } from './questionnaire-phase/questionnaire-level.component';
import { AdaptiveAccessLevelComponent } from './access-level/adaptive-access-level.component';
import { LinearAccessLevelComponent } from './access-level/linear-access-level.component';
import { Observable } from 'rxjs';
import { RunTopologyWrapperComponent } from './run-topology-wrapper/run-topology-wrapper.component';
import { Stepper, StepperItem, TopologySynchronizerService } from '@crczp/components';
import { SentinelResizeDirective } from '@sentinel/common/resize';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';

/**
 * Component to display one level in a training run. Serves mainly as a wrapper which determines the type of the training
 * and displays child component accordingly.
 *
 * Layout: horizontal split — task description (left) | topology (right).
 * Task pane can be toggled. Topology can be fullscreened.
 */
@Component({
    selector: 'crczp-abstract-level',
    templateUrl: './abstract-level.component.html',
    styleUrls: ['./abstract-level.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [TopologySynchronizerService],
    imports: [
        TrainingTimerComponent,
        MatTooltip,
        AsyncPipe,
        InfoLevelComponent,
        AdaptiveAccessLevelComponent,
        LinearAccessLevelComponent,
        LinearTrainingLevelComponent,
        AdaptiveTrainingLevelComponent,
        AssessmentLevelComponent,
        QuestionnaireLevelComponent,
        RunTopologyWrapperComponent,
        Stepper,
        SentinelResizeDirective,
        MatIcon,
    ],
})
export class AbstractLevelComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('splitContainer')
    protected readonly splitContainer: ElementRef<HTMLDivElement>;

    private readonly hostElement = inject(ElementRef<HTMLElement>);
    protected readonly runService = inject(AbstractTrainingRunService);
    protected readonly levelType = signal<AbstractLevelTypeEnum | AbstractPhaseTypeEnum>(null);
    protected readonly destroyRef = inject(DestroyRef);
    protected readonly AbstractLevelTypeEnum = AbstractLevelTypeEnum;
    protected readonly AbstractPhaseTypeEnum = AbstractPhaseTypeEnum;
    protected readonly displayedLevelTitle$: Observable<string>;
    protected readonly startTime$: Observable<Date>;
    protected readonly topologyService = inject(TopologySynchronizerService);
    protected readonly topologyAllowed = signal<boolean>(true);
    protected readonly stepperSteps = signal<StepperItem[]>([]);
    protected readonly stepperSelectedIndex = signal<number | null>(null);
    protected readonly stepperLastIndex = signal<number | null>(null);
    protected readonly stepperHeight = signal<number>(148);
    protected readonly sandboxInstanceId = signal<string | null>(null);

    /** Whether the task description pane is visible */
    protected readonly taskDescriptionVisible = signal<boolean>(true);
    /** Whether topology is in fullscreen mode */
    protected readonly topoFullscreen = signal<boolean>(false);
    /** Current width of the task pane in px */
    protected readonly taskPaneWidth = signal<number>(480);

    /** Horizontal resize dragging state */
    private isHResizing = false;
    private hDragStartX = 0;
    private hDragStartWidth = 0;

    private ancestorPaddedContent: HTMLElement | null = null;
    private originalPadding = '';

    constructor() {
        this.displayedLevelTitle$ = this.runService.runInfo$
            .observeProperty()
            .displayedLevel.title.$();

        this.startTime$ = this.runService.runInfo$
            .observeProperty()
            .startTime.$();
    }

    ngAfterViewInit(): void {
        this.removeLayoutPadding();
        this.fitSplitContainerToViewport();

        // Set initial task pane width to ~42% of container
        const containerW = this.splitContainer?.nativeElement?.clientWidth ?? 1024;
        const initialTaskW = this.clampTaskPaneWidth(Math.round(containerW * 0.42));
        this.taskPaneWidth.set(initialTaskW);

        // Notify topology of its initial width
        this.notifyTopoWidth();

        this.topologyService.topologyCollapsed$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.scheduleTopologyRefresh();
            });
    }

    ngOnDestroy(): void {
        if (this.ancestorPaddedContent) {
            this.ancestorPaddedContent.style.padding = this.originalPadding;
        }
        document.body.classList.remove('topology-fullscreen');
    }

    protected onStepperResized(height: number): void {
        this.stepperHeight.set(height);
        if (!this.splitContainer?.nativeElement) return;
        this.fitSplitContainerToViewport();
        this.notifyTopoWidth();
    }

    /** Toggle task description pane */
    protected toggleTaskDescription(): void {
        this.taskDescriptionVisible.update(v => !v);
        // After DOM settles, notify topology of new width
        this.scheduleTopologyRefresh();
    }

    /** Toggle topology fullscreen */
    protected toggleTopoFullscreen(): void {
        this.topoFullscreen.update(v => !v);
        document.body.classList.toggle('topology-fullscreen', this.topoFullscreen());
        this.scheduleTopologyRefresh();
    }

    /** Horizontal resize: mousedown on divider */
    protected onHResizeHandleMouseDown(event: MouseEvent): void {
        this.isHResizing = true;
        this.hDragStartX = event.clientX;
        this.hDragStartWidth = this.taskPaneWidth();
        event.preventDefault();
    }

    @HostListener('window:mousemove', ['$event'])
    onMouseMove(event: MouseEvent): void {
        if (!this.isHResizing) return;
        const delta = event.clientX - this.hDragStartX;
        const newW = this.clampTaskPaneWidth(this.hDragStartWidth + delta);
        this.taskPaneWidth.set(newW);
        this.notifyTopoWidth();
    }

    @HostListener('window:mouseup')
    onMouseUp(): void {
        if (this.isHResizing) {
            this.isHResizing = false;
            this.scheduleTopologyRefresh();
        }
    }

    @HostListener('window:resize')
    onResize() {
        if (!this.splitContainer?.nativeElement) return;
        this.fitSplitContainerToViewport();
        // Re-clamp task pane width
        const clamped = this.clampTaskPaneWidth(this.taskPaneWidth());
        if (clamped !== this.taskPaneWidth()) {
            this.taskPaneWidth.set(clamped);
        }
        this.notifyTopoWidth();
    }

    resetSplit(): void {
        const containerW = this.splitContainer?.nativeElement?.clientWidth ?? 1024;
        this.taskPaneWidth.set(this.clampTaskPaneWidth(Math.round(containerW * 0.42)));
        this.taskDescriptionVisible.set(true);
        this.topoFullscreen.set(false);
        document.body.classList.remove('topology-fullscreen');
        this.topologyService.setTopologyCollapsed(false);
        this.scheduleTopologyRefresh();
    }

    maximizeTopo(): void {
        this.taskDescriptionVisible.set(false);
        this.scheduleTopologyRefresh();
    }

    /** Clamp task pane width between 240px and 65% of container */
    private clampTaskPaneWidth(w: number): number {
        const containerW = this.splitContainer?.nativeElement?.clientWidth ?? 1024;
        return Math.max(240, Math.min(Math.round(containerW * 0.65), w));
    }

    /** Notify topology service of the available topology width */
    private notifyTopoWidth(): void {
        if (!this.splitContainer?.nativeElement) return;
        if (this.topoFullscreen()) {
            this.topologyService.emitTopologyWidthChange(window.innerWidth);
            this.topologyService.emitTopologyHeightChange(window.innerHeight);
            return;
        }
        const containerW = this.splitContainer.nativeElement.clientWidth;
        const taskW = this.taskDescriptionVisible() ? this.taskPaneWidth() : 0;
        const topoW = containerW - taskW - 5; // 5px for resize handle
        this.topologyService.emitTopologyWidthChange(Math.max(100, topoW));
        const containerH = this.splitContainer.nativeElement.clientHeight;
        this.topologyService.emitTopologyHeightChange(containerH);
    }

    private refreshTopologyDimensions(): void {
        this.notifyTopoWidth();
        window.dispatchEvent(new Event('resize'));
    }

    private scheduleTopologyRefresh(): void {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => this.refreshTopologyDimensions());
            });
        });
    }

    private fitSplitContainerToViewport(): void {
        if (!this.splitContainer?.nativeElement) return;
        const hostRect = this.hostElement.nativeElement.getBoundingClientRect();
        const rect = this.splitContainer.nativeElement.getBoundingClientRect();
        const hostAvailableH = Math.max(160, window.innerHeight - hostRect.top);
        const availableH = Math.max(160, window.innerHeight - rect.top);
        this.hostElement.nativeElement.style.height = hostAvailableH + 'px';
        this.splitContainer.nativeElement.style.height = availableH + 'px';
        this.splitContainer.nativeElement.style.flex = 'none';
    }

    private removeLayoutPadding(): void {
        this.ancestorPaddedContent = this.findAncestorByClass(
            this.hostElement.nativeElement,
            'padded-content',
        );
        if (!this.ancestorPaddedContent) return;
        this.originalPadding = this.ancestorPaddedContent.style.padding;
        this.ancestorPaddedContent.style.padding = '0';
    }

    private findAncestorByClass(element: HTMLElement, className: string): HTMLElement | null {
        let currentElement = element.parentElement;
        while (currentElement) {
            if (currentElement.classList.contains(className)) return currentElement;
            currentElement = currentElement.parentElement;
        }
        return null;
    }

    ngOnInit(): void {
        this.runService.runInfo$.subscribe((runInfo) => {
            this.updateLevelType(runInfo);
            this.updateTopologyAllowed(runInfo);
            this.updateStepper(runInfo);
            this.sandboxInstanceId.set(runInfo.sandboxInstanceId ?? null);
        });
    }

    private updateLevelType(runInfo: AccessTrainingRunInfo) {
        this.levelType.set(runInfo.displayedLevel.type);
    }

    private updateTopologyAllowed(runInfo: AccessTrainingRunInfo) {
        const shouldCollapse =
            runInfo.displayedLevel.type !== AbstractLevelTypeEnum.Training &&
            runInfo.displayedLevel.type !== AbstractLevelTypeEnum.Access &&
            runInfo.displayedLevel.type !== AbstractPhaseTypeEnum.Training &&
            runInfo.displayedLevel.type !== AbstractPhaseTypeEnum.Access;
        this.topologyAllowed.set(!shouldCollapse && !runInfo.localEnvironment);
        this.topologyService.setTopologyCollapsed(shouldCollapse || runInfo.localEnvironment);
    }

    private levelTypeToIcon(levelType: AbstractLevelTypeEnum | AbstractPhaseTypeEnum): string {
        switch (levelType) {
            case AbstractLevelTypeEnum.Info:
            case AbstractPhaseTypeEnum.Info: return 'info';
            case AbstractLevelTypeEnum.Training:
            case AbstractPhaseTypeEnum.Training: return 'videogame_asset';
            case AbstractLevelTypeEnum.Access:
            case AbstractPhaseTypeEnum.Access: return 'settings';
            case AbstractLevelTypeEnum.Assessment: return 'assignment';
            case AbstractPhaseTypeEnum.Questionnaire: return 'quiz';
            default: return 'help';
        }
    }

    private updateStepper(runInfo: AccessTrainingRunInfo) {
        const steps: StepperItem[] = runInfo.levels.map((level) => ({
            icon: this.levelTypeToIcon(level.type),
            label: level.title,
        }));
        this.stepperSteps.set(steps);
        this.stepperSelectedIndex.set(runInfo.displayedLevel.order);
        this.stepperLastIndex.set(runInfo.currentLevel.order);
    }
}
