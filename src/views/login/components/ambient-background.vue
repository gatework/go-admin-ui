<template>
  <div
    ref="ambient"
    class="login-ambient"
    :class="{
      'is-centered': centered,
      'is-still': !motionAllowed,
      'is-paused': visibility !== 'visible' || !windowFocused,
    }"
    aria-hidden="true"
  >
    <div class="login-atmosphere" />
    <div class="login-grid" />
    <div class="login-corner" />
    <div class="login-light-field">
      <div
        v-for="(glow, index) in glows"
        :key="index"
        class="login-light-glow"
        :style="glow"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

defineProps<{ centered?: boolean }>()
const ambient = ref<HTMLElement>()
const motionAllowed = ref(false)
const visibility = ref('visible')
const windowFocused = ref(true)
const motionEnabled = computed(() => motionAllowed.value && visibility.value === 'visible' && windowFocused.value)
const glows = [
  { x: 20, y: 18, size: 180 },
  { x: 80, y: 31, size: 210 },
  { x: 31, y: 87, size: 195 }
].map((zone, index) => ({
  '--login-light-x': `${zone.x}%`, '--login-light-y': `${zone.y}%`,
  '--login-light-size': `${zone.size}px`, '--login-light-duration': `${8 + index * 2}s`,
  '--login-light-phase': `${-index * 2.4}s`
}))
let frame: number | undefined
const cleanups: Array<() => void> = []
function resetLight() {
  if (frame !== undefined) cancelAnimationFrame(frame)
  frame = undefined
  ambient.value?.style.removeProperty('--login-pointer-x')
  ambient.value?.style.removeProperty('--login-pointer-y')
}
function moveLight(event: PointerEvent) {
  if (!motionEnabled.value) return
  if (event.pointerType !== 'mouse' || (event.target instanceof Element && event.target.closest('.login-content, .login-header, .login-footer')) || document.activeElement?.closest('.login-content')) {
    resetLight()
    return
  }
  if (frame !== undefined) return
  frame = requestAnimationFrame(() => {
    frame = undefined
    ambient.value?.style.setProperty('--login-pointer-x', Math.max(-1, Math.min(1, (event.clientX / innerWidth - 0.5) * 2)).toFixed(3))
    ambient.value?.style.setProperty('--login-pointer-y', Math.max(-1, Math.min(1, (event.clientY / innerHeight - 0.5) * 2)).toFixed(3))
  })
}
onMounted(() => {
  const motion = window.matchMedia('(prefers-reduced-motion: no-preference) and (min-width: 1121px) and (hover: hover) and (pointer: fine)')
  const update = () => {
    motionAllowed.value = motion.matches
    visibility.value = document.visibilityState
    windowFocused.value = document.hasFocus()
    if (!motionEnabled.value) resetLight()
  }
  motion.addEventListener('change', update)
  document.addEventListener('visibilitychange', update)
  window.addEventListener('focus', update)
  window.addEventListener('blur', update)
  window.addEventListener('pointermove', moveLight, { passive: true })
  window.addEventListener('resize', resetLight)
  window.addEventListener('focusin', resetLight)
  document.documentElement.addEventListener('pointerleave', resetLight)
  cleanups.push(() => {
    motion.removeEventListener('change', update)
    document.removeEventListener('visibilitychange', update)
    window.removeEventListener('focus', update)
    window.removeEventListener('blur', update)
    window.removeEventListener('pointermove', moveLight)
    window.removeEventListener('resize', resetLight)
    window.removeEventListener('focusin', resetLight)
    document.documentElement.removeEventListener('pointerleave', resetLight)
  })
  update()
})
onBeforeUnmount(() => { resetLight(); cleanups.forEach(cleanup => cleanup()) })
</script>

<style scoped lang="scss">
  .login-ambient {
    --login-pointer-x: 0;
    --login-pointer-y: 0;
    --login-light-color: var(--color-white);

    position: absolute;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    pointer-events: none;
  }

  .login-ambient::before {
    position: absolute;
    inset: 0;
    content: '';
    background: linear-gradient(
      145deg,
      color-mix(in srgb, var(--login-story-accent) 22%, var(--motor-chrome-surface))
        0%,
      color-mix(in srgb, var(--login-story-accent) 54%, var(--motor-chrome-surface))
        52%,
      color-mix(in srgb, var(--login-story-accent) 90%, var(--motor-chrome-surface))
        100%
    );
  }

  .login-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(
        var(
            --login-grid-color,
            color-mix(in srgb, var(--color-white) 5%, transparent)
          )
          1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        var(
            --login-grid-color,
            color-mix(in srgb, var(--color-white) 5%, transparent)
          )
          1px,
        transparent 1px
      );
    background-size: 48px 48px;
    mask-image: linear-gradient(to bottom, #000, transparent 80%);
  }

  .login-corner {
    position: absolute;
    right: -220px;
    bottom: -300px;
    width: 560px;
    aspect-ratio: 1;
    background: radial-gradient(
      ellipse,
      transparent 48%,
      color-mix(in srgb, var(--color-white) 9%, transparent) 56%,
      color-mix(in srgb, var(--color-white) 3%, transparent) 66%,
      transparent 74%
    );
    filter: blur(16px);
    mask-image: linear-gradient(
      135deg,
      transparent 10%,
      #000 38%,
      #000 58%,
      transparent 84%
    );
  }

  // A full-width canvas needs a quiet centre and light at its edges.
  .is-centered {
    --login-scene-base: var(--color-bg-2);
    --login-scene-corner: 28%;
    --login-scene-edge: 10%;
    --login-scene-start: 0.5%;
    --login-scene-end: 1.5%;
    --login-light-color: rgb(var(--primary-6));
  }

  body[arco-theme='dark'] .is-centered {
    --login-scene-base: var(--motor-chrome-surface);
    --login-scene-corner: 48%;
    --login-scene-edge: 24%;
    --login-scene-start: 0%;
    --login-scene-end: 2%;
    --login-light-color: var(--color-white);
  }

  .is-centered::before {
    background:
      radial-gradient(
        ellipse 60% 80% at 108% 108%,
        color-mix(
          in srgb,
          rgb(var(--primary-6)) var(--login-scene-corner),
          transparent
        ),
        transparent 80%
      ),
      radial-gradient(
        ellipse 48% 56% at -8% -12%,
        color-mix(
          in srgb,
          rgb(var(--primary-6)) var(--login-scene-edge),
          transparent
        ),
        transparent 85%
      ),
      linear-gradient(
        145deg,
        color-mix(
          in srgb,
          rgb(var(--primary-6)) var(--login-scene-start),
          var(--login-scene-base)
        ),
        color-mix(
          in srgb,
          rgb(var(--primary-6)) var(--login-scene-end),
          var(--login-scene-base)
        )
      );
  }

  .is-centered .login-grid {
    --login-grid-color: color-mix(
      in srgb,
      var(--login-light-color) 6%,
      transparent
    );

    opacity: 0.6;
    mask-image: radial-gradient(
      ellipse 64% 88% at 50% 45%,
      transparent 42%,
      #000 100%
    );
  }

  .is-centered .login-corner {
    display: none;
  }

  .login-atmosphere {
    position: absolute;
    inset: -10%;
    background: radial-gradient(
      ellipse at 75% 20%,
      color-mix(in srgb, var(--login-light-color) 5%, transparent),
      transparent 36%
    );
    transform: translate3d(
      calc(var(--login-pointer-x) * -16px),
      calc(var(--login-pointer-y) * -12px),
      0
    );
    transition: transform 900ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .login-light-field {
    position: absolute;
    inset: -8%;
    transform: translate3d(
      calc(var(--login-pointer-x) * 8px),
      calc(var(--login-pointer-y) * 6px),
      0
    );
    transition: transform 800ms cubic-bezier(0.16, 1, 0.3, 1);
    animation: login-light-arrival 1800ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .login-light-glow {
    position: absolute;
    top: var(--login-light-y);
    left: var(--login-light-x);
    width: var(--login-light-size);
    aspect-ratio: 1.6;
    background: radial-gradient(
      ellipse,
      color-mix(in srgb, var(--login-light-color) 10%, transparent),
      color-mix(in srgb, var(--login-light-color) 4%, transparent) 36%,
      transparent 74%
    );
    opacity: 0.45;
    filter: blur(24px);
    transform: translate(-50%, -50%);
    animation: login-light-breathe var(--login-light-duration)
      var(--login-light-phase) ease-in-out infinite;
  }

  @keyframes login-light-arrival {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes login-light-breathe {
    0%,
    100% {
      opacity: 0.25;
    }

    50% {
      opacity: 0.8;
    }
  }

  .is-paused .login-light-field,
  .is-paused .login-light-glow {
    animation-play-state: paused;
  }

  .is-still {
    .login-atmosphere {
      transform: none;
      transition: none;
    }

    .login-light-field {
      transform: translate3d(0, 0, 0);
      transition: none;
      animation: none;
    }

    .login-light-glow {
      animation: none;
    }
  }

  @media (width <= 1120px) {
    .login-ambient {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .login-atmosphere {
      transform: none;
      transition: none;
    }

    .login-light-field {
      transform: translate3d(0, 0, 0);
      transition: none;
      animation: none;
    }

    .login-light-glow {
      animation: none;
    }
  }

  html[data-motion='reduced'] {
    .login-atmosphere {
      transform: none;
      transition: none;
    }

    .login-light-field {
      transform: translate3d(0, 0, 0);
      transition: none;
      animation: none;
    }

    .login-light-glow {
      animation: none;
    }
  }
</style>
