import { Routes } from '@angular/router';

export const routes: Routes = [
    {
      path: '',
      pathMatch: 'full',
      redirectTo: 'dashboard'
    },
    {
      path: 'enrollment',
      children: [
        {
          path: 'list',
          loadComponent: () =>
            import('@features/autoDebit-enrollment/home/autoDebit-enrollment-home.component')
              .then(m => m.AutoDebitEnrollmentComponent)
        },
        {
          path: 'list/:id',
          loadComponent: () =>
            import('@features/autoDebit-enrollment/detail/autoDebit-enrollment-detail.page')
              .then(m => m.AutodebitEnrollmentDetailPageComponent)
        },
        {
          path: 'list/:id/edit',
          loadComponent: () =>
            import('@features/autoDebit-enrollment/detail/autoDebit-enrollment-detail.page')
              .then(m => m.AutodebitEnrollmentDetailPageComponent),
          data: { edit: true }
        }
      ]
    },
    {
      path: 'dashboard',
      loadComponent: () => import('@shared/layouts/feature-shell/feature-shell.component').then(m => m.FeatureShellComponent),
      children: [
        { path: '', loadComponent: () =>
            import('@features/autoDebit-enrollment/search/autoDebit-enrollment-search.component')
              .then(m => m.BorrowerLookupComponent)
        },
        {
          path: 'search',
          loadComponent: () =>
            import('@features/autoDebit-enrollment/search/autoDebit-enrollment-search.component')
              .then(m => m.BorrowerLookupComponent)
        },
        {
          path: 'autodebit',
          loadComponent: () =>
            import('@features/autoDebit-enrollment/home/autoDebit-enrollment-home.component')
              .then(m => m.AutoDebitEnrollmentComponent)
        },
        {
          path: 'autodebit/:id',
          loadComponent: () =>
            import('@features/autoDebit-enrollment/detail/autoDebit-enrollment-detail.page')
              .then(m => m.AutodebitEnrollmentDetailPageComponent)
        },
        {
          path: 'autodebit/:id/edit',
          loadComponent: () =>
            import('@features/autoDebit-enrollment/detail/autoDebit-enrollment-detail.page')
              .then(m => m.AutodebitEnrollmentDetailPageComponent),
          data: { edit: true }
        },
        {
          path: 'job-console',
          loadComponent: () => import('@features/job-console/job-console.page').then(m => m.JobConsolePageComponent)
        },
        {
          path: '**',
          loadComponent: () =>
            import('@shared/components/not-found/not-found.component')
              .then(m => m.NotFoundComponent)
        }
      ]
    },
    { path: '**', redirectTo: 'dashboard' }
  ];
