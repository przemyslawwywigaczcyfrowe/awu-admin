<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Menu from 'primevue/menu'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isAdmin = computed(() => authStore.user?.role === 'admin')

const menuItems = computed(() => {
  const items = [
    {
      label: 'Menu',
      items: [
        {
          label: 'Dashboard',
          icon: 'pi pi-home',
          command: () => router.push('/'),
          class: route.path === '/' ? 'active-menu-item' : ''
        },
        {
          label: 'Wyceny',
          icon: 'pi pi-list',
          command: () => router.push('/wyceny'),
          class: route.path.startsWith('/wyceny') ? 'active-menu-item' : ''
        },
        {
          label: 'Operacje salonowe',
          icon: 'pi pi-shop',
          command: () => router.push('/salon'),
          class: route.path.startsWith('/salon') ? 'active-menu-item' : ''
        },
        {
          label: 'Analityka',
          icon: 'pi pi-chart-bar',
          command: () => router.push('/analityka'),
          class: route.path.startsWith('/analityka') ? 'active-menu-item' : ''
        }
      ]
    }
  ]

  // Admin-only section
  if (isAdmin.value) {
    items[0].items.push({
      label: 'Użytkownicy',
      icon: 'pi pi-users',
      command: () => router.push('/uzytkownicy'),
      class: route.path.startsWith('/uzytkownicy') ? 'active-menu-item' : ''
    })
  }

  items[0].items.push({
    label: 'Ustawienia',
    icon: 'pi pi-cog',
    command: () => router.push('/ustawienia'),
    class: route.path.startsWith('/ustawienia') ? 'active-menu-item' : ''
  })

  return items
})
</script>

<template>
  <div class="sidebar-container">
    <div class="sidebar-logo">
      <span class="logo-text">AWU<span class="logo-text--accent"> PANEL</span></span>
    </div>

    <div class="sidebar-divider" />

    <Menu :model="menuItems" class="sidebar-menu" />
  </div>
</template>

<style scoped lang="scss">
.sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1B254B;
  letter-spacing: -0.02em;

  &--accent {
    font-weight: 400;
    color: var(--awu-gray-400);
  }
}

.sidebar-divider {
  height: 1px;
  background: var(--awu-gray-100);
  margin: 0 24px 20px;
}

.sidebar-menu {
  flex: 1;
  width: 100%;
  border: none;
  border-radius: 0;
  background: transparent;
  padding: 0 16px;
  overflow: visible;

  :deep(.p-menu-list) {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  :deep(.p-menu-item-link) {
    color: var(--awu-gray-400);
    border-radius: var(--awu-border-radius-sm);
    padding: 5px 10px;
    transition: all var(--awu-transition-speed) ease;
    font-weight: 500;
    font-size: 14px;
    position: relative;

    &:hover {
      background: var(--awu-gray-50);
      color: var(--awu-gray-800);
    }

    .p-menu-item-icon {
      font-size: 1rem;
      width: 1.25rem;
      margin-right: 18px;
    }
  }

  // Horizon active state: bold text + brand color (bar indicator in unscoped block below)
  :deep(.active-menu-item) {
    position: relative;

    .p-menu-item-content {
      position: relative;
    }

    .p-menu-item-link {
      color: var(--awu-gray-800);
      font-weight: 700;

      .p-menu-item-icon {
        color: var(--awu-blue);
      }

      &:hover {
        background: transparent;
      }
    }
  }

  :deep(.p-menu-subtitle) {
    color: var(--awu-gray-400);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
    padding: 1rem 10px 0.5rem;
  }
}
</style>

<!-- Unscoped block: pseudo-elements and overflow override need to bypass scoped CSS limitations -->
<style lang="scss">
.sidebar-menu .active-menu-item .p-menu-item-content {
  position: relative !important;
  overflow: visible !important;

  &::after {
    content: '';
    position: absolute;
    right: -4px;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 36px;
    background: var(--awu-blue);
    border-radius: 5px;
    z-index: 1;
  }
}
</style>
