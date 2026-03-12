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
      <div class="logo-mark">
        <span class="logo-mark__c">C</span>
      </div>
      <div class="logo-text-group">
        <span class="logo-text">cyfrowe<span class="logo-text--accent">.pl</span></span>
        <span class="logo-subtitle">Panel AWU</span>
      </div>
    </div>

    <div class="sidebar-divider" />

    <Menu :model="menuItems" class="sidebar-menu" />

    <div class="sidebar-footer">
      <div class="sidebar-footer__version">v1.0.0</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--awu-sidebar-bg);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px;
}

.logo-mark {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--awu-red);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &__c {
    font-size: 1.25rem;
    font-weight: 800;
    color: #fff;
    line-height: 1;
  }
}

.logo-text-group {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.logo-text {
  font-size: 1.2rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
  line-height: 1.2;

  &--accent {
    color: var(--awu-red);
    font-weight: 700;
  }
}

.logo-subtitle {
  font-size: 0.7rem;
  color: var(--awu-sidebar-text);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 500;
}

.sidebar-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 0 20px 12px;
}

.sidebar-menu {
  flex: 1;
  width: 100%;
  border: none;
  border-radius: 0;
  background: transparent;
  padding: 0 12px;
  overflow: visible;

  :deep(.p-menu-list) {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  :deep(.p-menu-item-link) {
    color: var(--awu-sidebar-text);
    border-radius: var(--awu-border-radius-sm);
    padding: 10px 12px;
    transition: all var(--awu-transition-speed) ease;
    font-weight: 500;
    font-size: 13px;
    position: relative;

    &:hover {
      background: var(--awu-sidebar-hover);
      color: var(--awu-sidebar-text-active);
    }

    .p-menu-item-icon {
      font-size: 1rem;
      width: 1.25rem;
      margin-right: 14px;
      opacity: 0.7;
    }
  }

  :deep(.active-menu-item) {
    position: relative;

    .p-menu-item-content {
      position: relative;
    }

    .p-menu-item-link {
      color: #fff;
      font-weight: 700;
      background: rgba(227, 6, 19, 0.15);

      .p-menu-item-icon {
        color: var(--awu-red);
        opacity: 1;
      }

      &:hover {
        background: rgba(227, 6, 19, 0.2);
      }
    }
  }

  :deep(.p-menu-subtitle) {
    color: rgba(255, 255, 255, 0.35);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
    padding: 1rem 12px 0.5rem;
  }
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);

  &__version {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.25);
    text-align: center;
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
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 24px;
    background: var(--awu-red);
    border-radius: 0 3px 3px 0;
    z-index: 1;
  }
}
</style>
