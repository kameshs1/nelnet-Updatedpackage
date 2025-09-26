import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthTokenService } from '../services/auth-token.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(AuthTokenService);
  const token = tokenService.getAccessToken();
  if (!token) {
    return next(req);
  }

  // Respect explicitly provided auth headers
  if (req.headers.has('Authorization') || req.headers.has('Token')) {
    return next(req);
  }

  // Attach Authorization header for requests to our API base URL
  const targetsOurApi = req.url.startsWith(environment.apiBaseUrl);
  if (targetsOurApi) {
    const authorized = req.clone({ setHeaders: { Authorization: token } });
    return next(authorized);
  }

  return next(req);
};


