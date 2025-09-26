import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIconModule } from '@nelnet/unifi-components-angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, UIconModule],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  @Input() icon: string = 'inbox';
  @Input() title: string = 'No data found';
  @Input() hint: string = '';
}


