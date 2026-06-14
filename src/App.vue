<template>
  <GameView />
  <DevPanel />
</template>

<script setup lang="ts">
import GameView from './views/GameView.vue'
import DevPanel from './components/common/DevPanel.vue'
</script>

<style>
/* Global app styles are imported in main.ts */
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
