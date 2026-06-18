import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
    signal,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { PortalAgendaContainer } from '../../../model/portal-agenda-container';
import { ValidPath } from '@crczp/routing-commons';

@Component({
    selector: 'crczp-portal-agenda-container',
    templateUrl: './portal-agenda-container.component.html',
    styleUrls: ['./portal-agenda-container.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIcon],
})
export class PortalAgendaContainerComponent {
    @Input() portalAgendaContainer: PortalAgendaContainer;
    @Input() elevation: string;
    @Input() isLast: boolean;

    @Output() navigation: EventEmitter<ValidPath> = new EventEmitter();
    @Output() setElevation: EventEmitter<string> = new EventEmitter();

    openMenu = signal('');

    elevate(event: string): void {
        this.setElevation.emit(event);
    }

    navigate(event: ValidPath): void {
        this.navigation.emit(event);
    }
}
