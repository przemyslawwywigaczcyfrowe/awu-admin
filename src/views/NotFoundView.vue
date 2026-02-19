<script setup lang="ts">
import Button from 'primevue/button'
</script>

<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <span class="not-found-code">404</span>
      <h1 class="not-found-title">Strona nie została znaleziona</h1>
      <p class="not-found-text">
        Strona, której szukasz, nie istnieje lub została przeniesiona.
      </p>
      <router-link to="/">
        <Button label="Wróć do pulpitu" icon="pi pi-home" />
      </router-link>
    </div>
  </div>
</template>

<style scoped lang="scss">
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.not-found-content {
  text-align: center;
}

.not-found-code {
  font-size: 6rem;
  font-weight: 800;
  color: var(--awu-gray-200);
  line-height: 1;
}

.not-found-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--awu-gray-800);
  margin: 0.5rem 0;
}

.not-found-text {
  color: var(--awu-gray-500);
  margin-bottom: 1.5rem;
}
</style>
