import { Pipe, PipeTransform } from '@angular/core';

// Formats many date-like strings into MM/DD/YYYY without time
@Pipe({ name: 'usDate', standalone: true })
export class UsDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const s = String(value).trim();
    // If already in MM/DD/YYYY, return
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return s;
    // If in MM/DD/YY, expand year to YYYY with a pivot (>=50 => 1900s, else 2000s)
    const mdyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (mdyy) {
      const [, m, d, yy] = mdyy;
      const twoDigit = Number(yy);
      const fullYear = twoDigit >= 50 ? 1900 + twoDigit : 2000 + twoDigit;
      return `${this.pad2(m)}\/${this.pad2(d)}\/${fullYear}`;
    }
    // If YYYY-MM-DD
    const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymd) {
      const [, y, m, d] = ymd;
      return `${this.pad2(m)}\/${this.pad2(d)}\/${y}`;
    }
    // Generic: extract digits
    const digits = s.replace(/[^0-9]/g, '');
    // MMDDYY
    if (digits.length === 6) {
      const m = digits.slice(0, 2);
      const d = digits.slice(2, 4);
      const yy = Number(digits.slice(4, 6));
      const fullYear = yy >= 50 ? 1900 + yy : 2000 + yy;
      return `${this.pad2(m)}\/${this.pad2(d)}\/${fullYear}`;
    }
    if (digits.length >= 8) {
      const m = digits.slice(0, 2);
      const d = digits.slice(2, 4);
      const y = digits.slice(4, 8);
      return `${this.pad2(m)}\/${this.pad2(d)}\/${y}`;
    }
    return s;
  }

  private pad2(n: string): string { return n.padStart(2, '0'); }
}


