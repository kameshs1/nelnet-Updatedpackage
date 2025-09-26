import { Component, Input, computed } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';

@Component({
  selector: 'app-form-error',
  standalone: true,
  imports: [],
  templateUrl: './form-error.component.html',
  styles: `.error-messages {
                color: #d9534f;
                font-size: 0.875rem;
                margin: 4px 0 0;
                padding-left: 1rem;
                }`,
})
export class FormErrorComponent {
  @Input() control: AbstractControl | null = null;

  /** Optional label (e.g. "Email") */
  @Input() label = 'Field';

  @Input() errorMessages: Record<string, string | ((error: any, label?: string) => string)> = {};

  get shouldShow(): boolean {
    const c = this.control;
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  get messages() {
    if (!this.shouldShow || !this.control?.errors) return [];
    const errors: ValidationErrors = this.control.errors;
    return Object.keys(errors).map((key) => {
      const custom = this.errorMessages[key];
      if (typeof custom === 'function') {
        return custom(errors[key], this.label);
      }
      if (typeof custom === 'string') {
        return custom;
      }
      // fallback default messages
      switch (key) {
        case 'required':
          return `${this.label} is required.`;
        case 'email':
          return `Please enter a valid email.`;
        case 'minlength':
          return `${this.label} must be at least ${errors['minlength'].requiredLength} characters.`;
        case 'maxlength':
          return `${this.label} must be at most ${errors['maxlength'].requiredLength} characters.`;
        case 'pattern':
          return `Invalid ${this.label} format.`;
        default:
          return `${this.label} is invalid.`;
      }
    });
  }
}
