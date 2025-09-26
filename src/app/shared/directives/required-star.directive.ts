import { Directive, ElementRef, Input, OnChanges, Renderer2, inject } from '@angular/core';

@Directive({ selector: '[appRequiredStar]', standalone: true })
export class RequiredStarDirective implements OnChanges {
  // When true, show the star (e.g., edit mode)
  @Input('appRequiredStar') enabled = false;
  // When true, field is required
  @Input() appRequired = false;

  private starEl: HTMLElement | null = null;

  private host = inject<ElementRef<HTMLElement>>(ElementRef as any);
  private rd = inject(Renderer2);

  ngOnChanges(): void {
    const shouldShow = this.enabled && this.appRequired;
    if (shouldShow && !this.starEl) {
      const star = this.rd.createElement('span') as HTMLElement;
      star.textContent = '* ';
      this.rd.setStyle(star, 'color', '#e53935');
      this.rd.setStyle(star, 'font-weight', '700');
      this.rd.setStyle(star, 'margin-right', '4px');
      const hostNode = this.host.nativeElement;
      const textSpan = hostNode.querySelector('.label-text') as HTMLElement | null;
      if (textSpan) {
        this.rd.insertBefore(textSpan, star, textSpan.firstChild);
      } else {
        this.rd.insertBefore(hostNode, star, hostNode.firstChild);
      }
      this.starEl = star;
    } else if (!shouldShow && this.starEl) {
      this.rd.removeChild(this.host.nativeElement, this.starEl);
      this.starEl = null;
    }
  }
}


