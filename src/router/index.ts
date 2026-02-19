import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { setupGuards } from '@/router/guards'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue')
      },
      {
        path: 'wyceny',
        name: 'AppraisalList',
        component: () => import('@/views/AppraisalListView.vue')
      },
      {
        path: 'wyceny/:id',
        name: 'AppraisalDetail',
        component: () => import('@/views/AppraisalDetailView.vue'),
        props: true
      },
      {
        path: 'salon',
        name: 'StoreOperations',
        component: () => import('@/views/StoreOperationsView.vue')
      },
      {
        path: 'salon/nowa-wycena',
        name: 'ManualAppraisal',
        component: () => import('@/views/ManualAppraisalView.vue')
      },
      {
        path: 'uzytkownicy',
        name: 'UserManagement',
        component: () => import('@/views/UserManagementView.vue'),
        meta: { requiresAdmin: true }
      },
      {
        path: 'ustawienia',
        name: 'Settings',
        component: () => import('@/views/SettingsView.vue')
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { requiresAuth: false }
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

setupGuards(router)

export default router
