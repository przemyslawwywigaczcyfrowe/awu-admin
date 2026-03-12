<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)

function handleLogin() {
  errorMessage.value = ''

  if (!email.value || !password.value) {
    errorMessage.value = 'Podaj adres e-mail i hasło.'
    return
  }

  loading.value = true
  const success = authStore.login(email.value, password.value)

  if (success) {
    router.push('/')
  } else {
    errorMessage.value = 'Nieprawidłowy adres e-mail lub hasło.'
  }

  loading.value = false
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">
          <div class="login-logo__mark">C</div>
          <span class="login-logo__text">cyfrowe<span class="login-logo__accent">.pl</span></span>
        </div>
        <h1 class="login-title">Panel Operatora AWU</h1>
        <p class="login-subtitle">Zaloguj się, aby kontynuować</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <Message v-if="errorMessage" severity="error" :closable="false" class="mb-4">
          {{ errorMessage }}
        </Message>

        <div class="field">
          <label for="email">Adres e-mail</label>
          <InputText
            id="email"
            v-model="email"
            type="email"
            placeholder="jan@cyfrowe.pl"
            class="w-full"
            autocomplete="email"
          />
        </div>

        <div class="field">
          <label for="password">Hasło</label>
          <Password
            id="password"
            v-model="password"
            :feedback="false"
            toggleMask
            placeholder="Wpisz hasło"
            class="w-full"
            inputClass="w-full"
            autocomplete="current-password"
          />
        </div>

        <Button
          type="submit"
          label="Zaloguj się"
          icon="pi pi-sign-in"
          class="w-full login-btn"
          :loading="loading"
        />
      </form>

      <div class="login-footer">
        <span>&copy; {{ new Date().getFullYear() }} Cyfrowe.pl</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--awu-sidebar-bg);
  padding: 1rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(135deg, #1A1A2E 0%, #16213E 100%);
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: var(--awu-sidebar-bg);
  }
}

.login-card {
  background: #fff;
  border-radius: var(--awu-border-radius);
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 1.5rem;

  &__mark {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: var(--awu-red);
    color: #fff;
    font-size: 1.4rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  &__text {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--awu-gray-900);
    letter-spacing: -0.02em;
  }

  &__accent {
    color: var(--awu-red);
  }
}

.login-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--awu-gray-900);
  margin-bottom: 0.25rem;
  letter-spacing: -0.02em;
}

.login-subtitle {
  color: var(--awu-gray-500);
  font-size: 0.9rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;

  label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--awu-gray-700);
  }
}

.login-btn {
  margin-top: 0.5rem;
}

.login-footer {
  text-align: center;
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--awu-gray-200);
  font-size: 0.78rem;
  color: var(--awu-gray-400);
}
</style>
