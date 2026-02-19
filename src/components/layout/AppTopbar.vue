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
  <div class="topbar-wrapper">
    <div class="topbar">
      <div class="topbar-left">
        <Button
          icon="pi pi-bars"
          text
          rounded
          severity="secondary"
          @click="toggleSidebar"
          aria-label="Toggle menu"
          class="topbar-burger"
        />
      </div>

      <div class="topbar-center">
        <div class="topbar-search">
          <i class="pi pi-search topbar-search__icon" />
          <InputText
            placeholder="Szukaj..."
            class="topbar-search__input"
            @keydown="handleScan"
          />
        </div>
      </div>

      <div class="topbar-right">
        <div class="location-badge">
          <i class="pi pi-map-marker" />
          <span class="location-name">{{ currentLocation }}</span>
        </div>

        <Button
          icon="pi pi-bell"
          text
          rounded
          severity="secondary"
          aria-label="Powiadomienia"
          class="topbar-icon-btn"
        />

        <div class="user-avatar" @click="logout" v-tooltip.bottom="'Wyloguj'">
          {{ userInitials }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.topbar-wrapper {
  padding: 12px 20px 0;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: #fff;
  border-radius: 30px;
  box-shadow: 14px 17px 40px 4px rgba(112, 144, 176, 0.18);
  gap: 8px;
}

.topbar-left {
  flex-shrink: 0;
}

.topbar-burger {
  width: 36px;
  height: 36px;
}

.topbar-center {
  flex: 1;
  max-width: 320px;
}

.topbar-search {
  position: relative;
  width: 100%;

  &__icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--awu-gray-400);
    font-size: 0.8rem;
    z-index: 1;
    pointer-events: none;
  }

  &__input {
    width: 100%;
    padding: 8px 12px 8px 34px !important;
    background: var(--awu-gray-50) !important;
    border: none !important;
    border-radius: 30px !important;
    font-size: 13px;
    color: var(--awu-gray-800);

    &::placeholder {
      color: var(--awu-gray-400);
    }

    &:focus {
      background: var(--awu-gray-100) !important;
      box-shadow: none !important;
    }
  }
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.topbar-icon-btn {
  width: 36px;
  height: 36px;
  color: var(--awu-gray-400) !important;
}

.location-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--awu-gray-50);
  color: var(--awu-blue);
  border-radius: 30px;
  font-size: 12px;
  font-weight: 600;
}

.location-name {
  white-space: nowrap;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #11047A;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.85;
  }
}

@media (max-width: 768px) {
  .topbar-center {
    display: none;
  }

  .location-name {
    display: none;
  }
}
</style>
