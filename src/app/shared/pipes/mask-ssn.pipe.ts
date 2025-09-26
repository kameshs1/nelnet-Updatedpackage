import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'maskSsn', standalone: true })
export class MaskSsnPipe implements PipeTransform {
  transform(value: string | null | undefined, show = false): string {
    if (!value) return '';
    const digits = String(value).replace(/[^0-9]/g, '').slice(0, 9);
    const part1 = digits.slice(0, 3);
    const part2 = digits.slice(3, 5);
    const part3 = digits.slice(5);
    const formatted = `${part1}${part1 && part2 ? '-' : ''}${part2}${part3 ? '-' : ''}${part3}`;
    if (show) return formatted;
    const masked = `***-**-${part3}`;
    return masked;
  }
}


