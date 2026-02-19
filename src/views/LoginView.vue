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
          class="w-full"
          :loading="loading"
        />
      </form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1A202C 0%, #2D3748 50%, #4318FF 100%);
  padding: 1rem;
}

.login-card {
  background: #fff;
  border-radius: 20px;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  box-shadow: var(--awu-shadow-lg);
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--awu-gray-800);
  margin-bottom: 0.25rem;
  letter-spacing: -0.02em;
}

.login-subtitle {
  color: var(--awu-gray-400);
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
    color: var(--awu-gray-600);
  }
}
</style>
