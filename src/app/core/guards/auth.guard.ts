import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthTokenService } from '../services/auth-token.service';

export const authGuard: CanActivateFn = () => {
  const tokenService = inject(AuthTokenService);
  const router = inject(Router);
  const token = tokenService.getAccessToken();
  if (token && token.trim().length > 0) {
    return true;
  }
  router.navigate(['/dashboard']);
  return false;
};


