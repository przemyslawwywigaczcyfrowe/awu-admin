<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()

const userName = computed(() => authStore.user?.name ?? 'Użytkownik')
const userInitials = computed(() => {
  const name = userName.value
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
})

const currentLocation = computed(() => authStore.user?.locationName ?? 'Salon')

function toggleSidebar() {
  uiStore.toggleSidebar()
}

function handleScan(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    const target = event.target as HTMLInputElement
    const value = target.value.trim()
    if (value) {
      router.push({ path: '/wyceny', query: { search: value } })
      target.value = ''
    }
  }
}

async function logout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="topbar">
    <div class="topbar-left">
      <Button
        icon="pi pi-bars"
        text
        rounded
        severity="secondary"
        @click="toggleSidebar"
        aria-label="Toggle menu"
      />
    </div>

    <div class="topbar-center">
      <span class="p-input-icon-left scan-input-wrapper">
        <i class="pi pi-search" />
        <InputText
          placeholder="Skanuj kod kreskowy lub wpisz nr wyceny..."
          class="scan-input"
          @keydown="handleScan"
        />
      </span>
    </div>

    <div class="topbar-right">
      <div class="location-badge">
        <i class="pi pi-map-marker" />
        <span class="location-name">{{ currentLocation }}</span>
      </div>

      <div class="user-info">
        <div class="user-avatar">{{ userInitials }}</div>
        <span class="user-name">{{ userName }}</span>
      </div>

      <Button
        icon="pi pi-sign-out"
        text
        rounded
        severity="danger"
        @click="logout"
        aria-label="Wyloguj"
        v-tooltip.bottom="'Wyloguj'"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  height: var(--awu-topbar-height);
  background: #fff;
  border-bottom: 1px solid var(--awu-gray-200);
  gap: 1rem;
}

.topbar-left {
  flex-shrink: 0;
}

.topbar-center {
  flex: 1;
  max-width: 500px;
}

.scan-input-wrapper {
  width: 100%;
}

.scan-input {
  width: 100%;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.location-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--awu-blue-bg);
  color: var(--awu-blue);
  border-radius: var(--awu-border-radius);
  font-size: 0.875rem;
  font-weight: 500;
}

.location-name {
  white-space: nowrap;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--awu-blue);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--awu-gray-700);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .topbar-center {
    display: none;
  }

  .location-name,
  .user-name {
    display: none;
  }
}
</style>
