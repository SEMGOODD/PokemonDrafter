import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { typeIconSrc } from '../../constants/pokemon-types.const';

@Component({
  selector: 'app-type-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge">
      <img class="badge__icon" [src]="iconSrc()" [alt]="type()" draggable="false"/>
      <span class="badge__label">{{ type() }}</span>
    </span>
  `,
  styles: [`
    :host { display: inline-block; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .badge__icon {
      width: 1.5rem;
      height: 1.5rem;
      display: block;
      user-select: none;
    }
    .badge__label {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: capitalize;
      color: #333333;
      letter-spacing: 0.02em;
    }
  `]
})
export class TypeBadgeComponent {
  readonly type = input.required<string>();

  readonly iconSrc = computed(() => typeIconSrc(this.type()));
}
