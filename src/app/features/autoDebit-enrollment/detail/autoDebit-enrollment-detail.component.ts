import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RequiredStarDirective } from '../../../shared/directives/required-star.directive';
import {
  UDatePickerModule,
  UFormControlModule,
  UInputModule,
  ULabelModule,
  URadioButtonModule,
  USelectModule,
} from '@nelnet/unifi-components-angular';
import { FormErrorComponent } from '@shared/components/form-error/form-error.component';
import { numberValidator } from '@shared/validators/number.validator';

export interface AutoDebitDetailRecord {
  id?: string;
  eftControl: string;
  eftEligible: string;
  startDate: string;
  endDate: string;
  bankId: string;
  csInd: string;
  lastChange: string;
  override: string;
  processDay: number | string;
  accountNumber?: string;
  routingNumber?: string;
}

type FormMode = 'add' | 'edit' | 'view';

type radioTypes = 'Y' | 'N';

type csIndTypes = '' | 'c' | 's';

type overrideTypes = '' | 'A';

interface AutoDebitForm {
  eftControl: FormControl<radioTypes>;
  eftEligible: FormControl<radioTypes>;
  startDate: FormControl<string>;
  endDate: FormControl<string>;
  bankId: FormControl<string>;
  accountNumber: FormControl<string>;
  csInd: FormControl<csIndTypes>;
  lastChange: FormControl<string>;
  override: FormControl<overrideTypes>;
  processDay: FormControl<number>;
}

type AutoDebitFormValue = FormGroup<AutoDebitForm>['value'];

@Component({
  selector: 'app-autodebit-enrollment-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UFormControlModule,
    ULabelModule,
    UInputModule,
    RequiredStarDirective,
    URadioButtonModule,
    UDatePickerModule,
    USelectModule,
    FormErrorComponent,
  ],
  templateUrl: './autoDebit-enrollment-detail.component.html',
  styleUrls: ['./autoDebit-enrollment-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoDebitEnrollmentDetailComponent implements OnChanges {
  @Input() mode: FormMode = 'add';
  @Input() record: AutoDebitDetailRecord | null = null;
  @Input() submitRequested = 0; // 👈 counter from parent
  @Output() submitted = new EventEmitter<AutoDebitDetailRecord>();
  private emittedOnce = false;

  formTitle = 'Auto Debit Enrollment Detail';
  triedSave = false;
  showConfirm = false;
  pendingUpdate: AutoDebitDetailRecord | null = null;

  model: AutoDebitDetailRecord | null = null;
  private readonly fb = inject(NonNullableFormBuilder);

  csIndOptions = [
    { label: 'Select', value: '' },
    { label: 'Checking', value: 'c' },
    { label: 'Savings', value: 's' },
  ];

  overrideOptions = [
    { label: 'No', value: '' },
    { label: 'Yes', value: 'A' },
  ];

  editable = false;

  private todayUsDateString(): string {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    return `${mm}/${dd}/${yyyy}`;
  }

  form: FormGroup<AutoDebitForm> = this.fb.group<AutoDebitForm>({
    eftControl: this.fb.control<radioTypes>('N', {
      validators: [Validators.required],
    }),
    eftEligible: this.fb.control<radioTypes>('N', {
      validators: [Validators.required],
    }),
    startDate: this.fb.control<string>('', {
      validators: [Validators.required],
    }),
    endDate: this.fb.control<string>('', { validators: [Validators.required] }),
    bankId: this.fb.control<string>('', { validators: [Validators.required] }),
    accountNumber: this.fb.control<string>('', {
      validators: [Validators.required, Validators.minLength(4)],
    }),
    csInd: this.fb.control<csIndTypes>('', {
      validators: [Validators.required],
    }),
    lastChange: this.fb.control<string>({
      disabled: true,
      value: this.todayUsDateString(),
    }),
    override: this.fb.control<overrideTypes>(''),
    processDay: this.fb.control<number>(0, {
      validators: [Validators.required, numberValidator()],
    }),
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['record']) {
      if (this.record) {
        this.form.patchValue(this.mapRecordToForm(this.record));
      } else if (this.mode === 'add') {
        // When switching from edit->add ensure the form resets to clean defaults
        this.resetFormForAdd();
      }
    }

    if (changes['mode']) {
      if (this.mode === 'view') {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
        // keep lastChange read-only
        this.form.get('lastChange')?.disable({ emitEvent: false });
      }
      if (this.mode === 'add') {
        // Ensure add mode always starts with empty form
        this.resetFormForAdd();
      }
    }

    // 👇 detect submit trigger
    if (changes['submitRequested'] && !changes['submitRequested'].firstChange) {
      this.submit();
    }
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.emittedOnce) return;
    this.emittedOnce = true;
    this.submitted.emit(this.form.getRawValue());
    // reset after small delay so subsequent opens can submit again
    setTimeout(() => {
      this.emittedOnce = false;
    }, 1000);
  }

  // 🔑 helper function to normalize backend data to form structure
  private mapRecordToForm(record: AutoDebitDetailRecord): AutoDebitFormValue {
    return {
      eftControl: (record.eftControl as radioTypes) ?? 'N',
      eftEligible: (record.eftEligible as radioTypes) ?? 'N',
      startDate: record.startDate || '',
      endDate: record.endDate || '',
      // UI label is Routing Number; prefer routingNumber if provided
      bankId: record.routingNumber || record.bankId || '',
      accountNumber: record.accountNumber || '',
      csInd: (String(record.csInd ?? '').toLowerCase() as csIndTypes) || '',
      lastChange: record.lastChange || '',
      override: ((String(record.override ?? '').toUpperCase() === 'Y' ? 'A' : '') as overrideTypes) || '',
      processDay: Number(record.processDay) || 0,
    };
  }

  private resetFormForAdd(): void {
    this.form.reset({
      eftControl: 'N',
      eftEligible: 'N',
      startDate: '',
      endDate: '',
      bankId: '',
      accountNumber: '',
      csInd: '',
      lastChange: this.todayUsDateString(),
      override: '',
      processDay: 0,
    });
    // ensure lastChange remains read-only after reset
    this.form.get('lastChange')?.disable({ emitEvent: false });
  }
}
