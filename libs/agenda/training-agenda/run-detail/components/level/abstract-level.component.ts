import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    HostListener,
    inject,
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

/**
 * Component to display one level in a training run. Serves mainly as a wrapper which determines the type of the training
 * and displays child component accordingly
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
        AdaptiveAccessLevelComponent,
        LinearAccessLevelComponent,
        LinearTrainingLevelComponent,
        AdaptiveTrainingLevelComponent,
        AssessmentLevelComponent,
        QuestionnaireLevelComponent,
        RunTopologyWrapperComponent,
        Stepper,
        SentinelResizeDirective,
    ],
})
export class AbstractLevelComponent implements OnInit, AfterViewInit {
    @ViewChild('levelContent')
    protected readonly levelContent: ElementRef<HTMLDivElement>;
    @ViewChild('splitContainer')
    protected readonly splitContainer: ElementRef<HTMLDivElement>;

    protected readonly runService = inject(AbstractTrainingRunService);
    protected readonly levelType = signal<
        AbstractLevelTypeEnum | AbstractPhaseTypeEnum
    >(null);
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
    protected readonly topoHeight = signal<number>(240);
    protected readonly sandboxInstanceId = signal<string | null>(null);

    private isResizing = false;
    private dragStartY = 0;
    private dragStartHeight = 0;

    constructor() {
        this.displayedLevelTitle$ = this.runService.runInfo$
            .observeProperty()
            .displayedLevel.title.$();

        this.startTime$ = this.runService.runInfo$
            .observeProperty()
            .startTime.$();
    }

    ngAfterViewInit(): void {
        this.fitSplitContainerToViewport();
        const splitH = this.splitContainer.nativeElement.clientHeight;
        const initialTopoH = Math.max(
            96,
            Math.min(320, Math.round(splitH * 0.34)),
        );
        this.topoHeight.set(initialTopoH);
        this.topologyService.emitTopologyWidthChange(
            this.splitContainer.nativeElement.clientWidth,
        );
        this.topologyService.emitTopologyHeightChange(initialTopoH);
        this.onResize();
    }

    protected onStepperResized(height: number): void {
        this.stepperHeight.set(height);
        if (!this.splitContainer?.nativeElement) return;
        this.fitSplitContainerToViewport();
        this.topologyService.emitTopologyWidthChange(
            this.splitContainer.nativeElement.clientWidth,
        );
    }

    protected onResizeHandleMouseDown(event: MouseEvent): void {
        this.isResizing = true;
        this.dragStartY = event.clientY;
        this.dragStartHeight = this.topoHeight();
        event.preventDefault();
    }

    @HostListener('window:mousemove', ['$event'])
    onMouseMove(event: MouseEvent): void {
        if (!this.isResizing) return;
        const delta = this.dragStartY - event.clientY;
        const newHeight = this.clampTopologyHeight(
            this.dragStartHeight + delta,
        );
        this.topoHeight.set(newHeight);
        this.topologyService.emitTopologyHeightChange(newHeight);
    }

    @HostListener('window:mouseup')
    onMouseUp(): void {
        this.isResizing = false;
    }

    @HostListener('window:resize')
    onResize() {
        if (!this.splitContainer?.nativeElement) return;
        this.fitSplitContainerToViewport();
        const newHeight = this.clampTopologyHeight(this.topoHeight());
        if (this.topoHeight() !== newHeight) {
            this.topoHeight.set(newHeight);
            this.topologyService.emitTopologyHeightChange(newHeight);
        }
        this.topologyService.emitTopologyWidthChange(
            this.splitContainer.nativeElement.clientWidth,
        );
        this.topologyService.setMaxTopologyWidth(null);
        this.topologyService.setMinTopologyWidth(null);
    }

    resetSplit(): void {
        if (!this.splitContainer?.nativeElement) return;
        const h = this.splitContainer.nativeElement.clientHeight;
        const newHeight = this.clampTopologyHeight(Math.round(h * 0.45));
        this.topoHeight.set(newHeight);
        this.topologyService.emitTopologyHeightChange(newHeight);
    }

    maximizeTopo(): void {
        if (!this.splitContainer?.nativeElement) return;
        const h = this.splitContainer.nativeElement.clientHeight;
        const newHeight = this.clampTopologyHeight(Math.round(h * 0.78));
        this.topoHeight.set(newHeight);
        this.topologyService.emitTopologyHeightChange(newHeight);
    }

    private clampTopologyHeight(height: number): number {
        const splitH = this.splitContainer?.nativeElement?.clientHeight ?? 800;
        const maxTopoH = Math.max(96, splitH - 96);
        return Math.max(96, Math.min(maxTopoH, height));
    }

    private fitSplitContainerToViewport(): void {
        if (!this.splitContainer?.nativeElement) return;
        const rect = this.splitContainer.nativeElement.getBoundingClientRect();
        const availableH = Math.max(160, window.innerHeight - rect.top);
        this.splitContainer.nativeElement.style.height = availableH + 'px';
        this.splitContainer.nativeElement.style.flex = 'none';
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
        const levelType = runInfo.displayedLevel.type;
        this.levelType.set(levelType);
    }

    private updateTopologyAllowed(runInfo: AccessTrainingRunInfo) {
        const shouldCollapse =
            runInfo.displayedLevel.type !== AbstractLevelTypeEnum.Training &&
            runInfo.displayedLevel.type !== AbstractLevelTypeEnum.Access &&
            runInfo.displayedLevel.type !== AbstractPhaseTypeEnum.Training &&
            runInfo.displayedLevel.type !== AbstractPhaseTypeEnum.Access;
        this.topologyAllowed.set(!shouldCollapse && !runInfo.localEnvironment);
        this.topologyService.setTopologyCollapsed(
            shouldCollapse || runInfo.localEnvironment,
        );
    }

    private levelTypeToIcon(
        levelType: AbstractLevelTypeEnum | AbstractPhaseTypeEnum,
    ): string {
        switch (levelType) {
            case AbstractLevelTypeEnum.Info:
            case AbstractPhaseTypeEnum.Info:
                return 'info';
            case AbstractLevelTypeEnum.Training:
            case AbstractPhaseTypeEnum.Training:
                return 'videogame_asset';
            case AbstractLevelTypeEnum.Access:
            case AbstractPhaseTypeEnum.Access:
                return 'settings';
            case AbstractLevelTypeEnum.Assessment:
                return 'assignment';
            case AbstractPhaseTypeEnum.Questionnaire:
                return 'quiz';
            default:
                return 'help';
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
