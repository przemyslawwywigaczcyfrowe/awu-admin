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
      <span class="logo-text">AWU Panel</span>
    </div>

    <Menu :model="menuItems" class="sidebar-menu" />
  </div>
</template>

<style scoped lang="scss">
.sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--awu-gray-900);
  color: #fff;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--awu-topbar-height);
  padding: 0 1rem;
  border-bottom: 1px solid var(--awu-gray-700);
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--awu-blue-light);
  letter-spacing: 0.5px;
}

.sidebar-menu {
  flex: 1;
  width: 100%;
  border: none;
  border-radius: 0;
  background: transparent;

  :deep(.p-menu-item-link) {
    color: var(--awu-gray-300);
    transition: all var(--awu-transition-speed) ease;

    &:hover {
      background: var(--awu-gray-800);
      color: #fff;
    }
  }

  :deep(.active-menu-item) {
    .p-menu-item-link {
      background: var(--awu-blue-dark);
      color: #fff;
      border-left: 3px solid var(--awu-blue-light);
    }
  }

  :deep(.p-menu-subtitle) {
    color: var(--awu-gray-500);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 1rem 1rem 0.5rem;
  }
}
</style>
