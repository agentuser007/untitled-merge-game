<template>
  <Transition name="cg-detail-fade">
    <div v-if="visible" class="cg-detail-overlay" @click.self="$emit('close')">
      <div class="cg-detail-card" :class="leadColorClass">
        <button class="cg-detail-close" @click="$emit('close')">✕</button>

        <div class="cg-detail-header">
          <span class="cg-detail-lead-emoji">{{ getLeadAvatarEmoji(cgData.maleLeadId) }}</span>
          <div class="cg-detail-header-text">
            <div class="cg-detail-lead-name">{{ getSpeakerDisplayName(cgData.maleLeadId) }}</div>
            <div class="cg-detail-title">{{ cgData.title }}</div>
          </div>
        </div>

        <div class="cg-detail-frag-summary">
          <span class="cg-detail-frag-icon">🧩</span>
          <span class="cg-detail-frag-text">{{ cgData.memoryFragments }} / {{ fragmentCost }}</span>
          <div class="cg-detail-frag-bar">
            <div
              class="cg-detail-frag-fill"
              :style="{ width: Math.min(100, (cgData.memoryFragments / fragmentCost) * 100) + '%' }"
            />
          </div>
        </div>

        <div class="cg-detail-stories">
          <div
            v-for="(story, idx) in stories"
            :key="idx"
            class="cg-detail-story-item"
            :class="getStoryStatus(idx)"
          >
            <div class="story-dot-row">
              <span class="story-dot" :class="getStoryStatus(idx)" />
              <span v-if="idx < stories.length - 1" class="story-connector" :class="{ filled: cgData.unlocked.includes(idx) }" />
            </div>
            <div class="story-content">
              <div class="story-title">
                <span class="story-index">{{ idx + 1 }}</span>
                <span class="story-name">{{ story.title }}</span>
                <span v-if="cgData.unlocked.includes(idx)" class="story-badge unlocked">✅</span>
                <span v-else-if="canUnlockThis(idx)" class="story-badge can-unlock">🔓</span>
                <span v-else class="story-badge locked">🔒</span>
              </div>
              <div v-if="cgData.unlocked.includes(idx)" class="story-action">
                <button class="story-btn story-btn-review" @click="reviewStory(idx)">
                  📖 回顾
                </button>
              </div>
              <div v-else-if="canUnlockThis(idx)" class="story-action">
                <button class="story-btn story-btn-unlock" @click="unlockStory">
                  ✨ 解锁 ({{ fragmentCost }}🧩)
                </button>
              </div>
              <div v-else class="story-action">
                <span class="story-hint">需要 {{ fragmentCost }} 碎片</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="allUnlocked" class="cg-detail-all-done">
          ✅ 全部章节已解锁
        </div>

        <Transition name="unlock-flash">
          <div v-if="showUnlockEffect" class="unlock-effect">
            <span class="unlock-star">✨</span>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCGAlbumStore } from '../../stores/cgAlbumStore'
import { useConfigStore } from '../../stores/configStore'
import { useVNReaderStore } from '../../stores/vnReaderStore'
import { useI18nStore } from '../../stores/i18nStore'
import { globalBus } from '../../core/EventBus'

const props = defineProps<{
  visible: boolean
  ssrId: string
}>()

const emit = defineEmits<{
  close: []
}>()

const cgAlbumStore = useCGAlbumStore()
const configStore = useConfigStore()
const vnStore = useVNReaderStore()
const i18nStore = useI18nStore()

const showUnlockEffect = ref(false)

const cgData = computed(() => {
  const cg = cgAlbumStore.cgData[props.ssrId]
  if (cg) return cg
  const storyConfig = configStore.cgStories[props.ssrId]
  if (storyConfig) {
    return {
      unlocked: [] as number[],
      memoryFragments: 0,
      title: storyConfig.title || props.ssrId,
      maleLeadId: storyConfig.maleLeadId || '???',
      ssrId: props.ssrId
    }
  }
  return {
    unlocked: [] as number[],
    memoryFragments: 0,
    title: props.ssrId,
    maleLeadId: '???',
    ssrId: props.ssrId
  }
})

const stories = computed(() => {
  const storyConfig = configStore.cgStories[props.ssrId]
  if (!storyConfig?.stories) return []
  return storyConfig.stories.map((s, i: number) => ({
    title: s.title || `${i + 1}`,
    index: i
  }))
})

const fragmentCost = computed(() => configStore.fragmentToStory || 60)

const allUnlocked = computed(() => {
  if (stories.value.length === 0) return false
  return stories.value.every((_s, i: number) => cgData.value.unlocked.includes(i))
})

const leadColorClass = computed(() => {
  switch (cgData.value.maleLeadId) {
    case 'morven': return 'lead-morven'
    case 'daniel': return 'lead-daniel'
    case 'vincent': return 'lead-yuan'
    case 'leo': return 'lead-lu'
    default: return ''
  }
})

function getLeadAvatarEmoji(leadId: string): string {
  switch (leadId) {
    case 'morven': return '💄'
    case 'daniel': return '🧪'
    case 'vincent': return '📝'
    case 'leo': return '🍬'
    default: return '👤'
  }
}

function getSpeakerDisplayName(speakerId: string): string {
  const profile = configStore.characterProfiles[speakerId]
  if (!profile) return speakerId
  return i18nStore.locale === 'en' ? (profile.nameEn || profile.name || speakerId) : (profile.name || speakerId)
}

function getStoryStatus(idx: number): string {
  if (cgData.value.unlocked.includes(idx)) return 'unlocked'
  if (canUnlockThis(idx)) return 'can-unlock'
  return 'locked'
}

function canUnlockThis(idx: number): boolean {
  if (cgData.value.unlocked.includes(idx)) return false
  if (idx === 0) return cgData.value.memoryFragments >= fragmentCost.value
  const prevUnlocked = cgData.value.unlocked.includes(idx - 1)
  if (!prevUnlocked) return false
  return cgData.value.memoryFragments >= fragmentCost.value && idx === cgData.value.unlocked.length
}

function unlockStory() {
  const success = cgAlbumStore.tryUnlockNext(props.ssrId)
  if (success) {
    showUnlockEffect.value = true
    setTimeout(() => {
      showUnlockEffect.value = false
    }, 800)
    globalBus.emit('cg:nextUnlocked', {
      cgId: props.ssrId,
      storyIndex: cgData.value.unlocked.length - 1
    })
  }
}

function reviewStory(storyIndex: number) {
  emit('close')
  vnStore.open(props.ssrId, storyIndex)
}

watch(() => props.visible, (v) => {
  if (!v) showUnlockEffect.value = false
})
</script>

<style scoped>
.cg-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 9500;
  background: rgba(90, 62, 43, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.cg-detail-card {
  background: #FFF5EE;
  border: 3px solid var(--warm-border);
  border-radius: 20px;
  width: 100%;
  max-width: 360px;
  max-height: 80vh;
  overflow-y: auto;
  padding: 20px 16px;
  position: relative;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  box-sizing: border-box;
}

.cg-detail-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid var(--warm-border);
  background: #fff;
  color: var(--warm-border);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
  padding: 0;
}

.cg-detail-close:active {
  transform: scale(0.9);
}

.cg-detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(181, 147, 116, 0.3);
}

.cg-detail-lead-emoji {
  font-size: 28px;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.lead-morven .cg-detail-lead-emoji { background: #FFF0F3; }
.lead-daniel .cg-detail-lead-emoji { background: #F3ECF6; }
.lead-yuan .cg-detail-lead-emoji { background: #EAF2F9; }
.lead-lu .cg-detail-lead-emoji { background: #FFF3E0; }

.cg-detail-header-text {
  flex: 1;
  min-width: 0;
}

.cg-detail-lead-name {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.7;
}

.lead-morven .cg-detail-lead-name { color: #F35683; }
.lead-daniel .cg-detail-lead-name { color: var(--rarity-sr); }
.lead-yuan .cg-detail-lead-name { color: #5D4E37; }
.lead-lu .cg-detail-lead-name { color: #e67e22; }

.cg-detail-title {
  font-size: 16px;
  font-weight: 900;
  color: var(--text-heading);
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

.cg-detail-frag-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 10px;
  border: 1px solid rgba(181, 147, 116, 0.15);
}

.cg-detail-frag-icon {
  font-size: 14px;
}

.cg-detail-frag-text {
  font-size: 11px;
  font-weight: 700;
  color: #8A6D55;
  white-space: nowrap;
}

.cg-detail-frag-bar {
  flex: 1;
  height: 6px;
  background: #EAE5C9;
  border-radius: 3px;
  overflow: hidden;
}

.cg-detail-frag-fill {
  height: 100%;
  background: linear-gradient(90deg, #E6A23C, #F56C6C);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.cg-detail-stories {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.cg-detail-story-item {
  display: flex;
  gap: 10px;
  min-height: 60px;
}

.story-dot-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 18px;
  flex-shrink: 0;
  padding-top: 4px;
}

.story-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #ddd;
  background: #f5f5f5;
  flex-shrink: 0;
}

.story-dot.unlocked {
  background: #5BAD7D;
  border-color: #5BAD7D;
}

.story-dot.can-unlock {
  background: #FFF3E0;
  border-color: #e67e22;
  box-shadow: 0 0 6px rgba(230, 126, 34, 0.3);
}

.story-dot.locked {
  background: #f5f5f5;
  border-color: #ddd;
}

.story-connector {
  width: 2px;
  height: 40px;
  background: #eee;
  margin-top: 2px;
}

.story-connector.filled {
  background: #5BAD7D;
}

.story-content {
  flex: 1;
  padding-bottom: 14px;
}

.story-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.story-index {
  font-size: 11px;
  font-weight: 800;
  color: #B28265;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(181, 147, 116, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.story-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-heading);
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

.story-badge {
  font-size: 12px;
  margin-left: auto;
}

.story-action {
  margin-top: 4px;
}

.story-btn {
  border: none;
  border-radius: 8px;
  padding: 5px 14px;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Jiangcheng Yuanti', sans-serif;
  cursor: pointer;
  transition: transform 0.15s, filter 0.15s;
}

.story-btn:active {
  transform: scale(0.93);
}

.story-btn-review {
  background: rgba(181, 147, 116, 0.15);
  color: #8A6D55;
}

.story-btn-unlock {
  background: linear-gradient(135deg, #E6A23C, #F56C6C);
  color: #fff;
  box-shadow: 0 2px 8px rgba(230, 162, 60, 0.3);
}

.story-hint {
  font-size: 10px;
  color: #B28265;
  font-weight: 500;
}

.cg-detail-all-done {
  text-align: center;
  padding: 10px;
  font-size: 13px;
  font-weight: 700;
  color: #5BAD7D;
  margin-top: 6px;
}

.unlock-effect {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

.unlock-star {
  font-size: 48px;
  animation: unlock-pulse 0.8s ease-out;
}

@keyframes unlock-pulse {
  0% { transform: scale(0.5); opacity: 0; }
  40% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(1.8); opacity: 0; }
}

.cg-detail-fade-enter-active,
.cg-detail-fade-leave-active {
  transition: opacity 0.3s ease;
}

.cg-detail-fade-enter-from,
.cg-detail-fade-leave-to {
  opacity: 0;
}

.unlock-flash-enter-active {
  transition: opacity 0.15s ease;
}

.unlock-flash-leave-active {
  transition: opacity 0.6s ease;
}

.unlock-flash-enter-from,
.unlock-flash-leave-to {
  opacity: 0;
}
</style>
