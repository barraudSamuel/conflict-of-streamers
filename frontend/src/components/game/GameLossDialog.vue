<script setup lang="ts">
import Dialog from '@/components/ui/dialog/Dialog.vue'
import DialogContent from '@/components/ui/dialog/DialogContent.vue'
import DialogDescription from '@/components/ui/dialog/DialogDescription.vue'
import DialogFooter from '@/components/ui/dialog/DialogFooter.vue'
import DialogHeader from '@/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import DialogClose from '@/components/ui/dialog/DialogClose.vue'
import {Button} from '@/components/ui/button'
import {OctagonX} from 'lucide-vue-next'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
}>()
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
        :overlay-class="'bg-card/75 backdrop-blur-sm'"
        class="w-full max-w-md space-y-4 border-destructive/30 bg-card/90 p-6 sm:max-h-[85vh] sm:overflow-y-auto sm:p-8"
    >
      <DialogHeader class="items-start gap-3 text-left">
        <div class="flex items-center gap-3">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/15 ring-1 ring-destructive/40">
            <OctagonX class="size-5 text-destructive"/>
          </span>
          <div class="space-y-1">
            <DialogTitle class="text-left text-xl text-red-300">
              Vous avez perdu
            </DialogTitle>
            <DialogDescription class="text-left leading-relaxed text-muted-foreground">
              Vous n'avez plus de territoire sous votre contrôle. Restez en spectateur ou
              quittez la partie quand vous le souhaitez.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <DialogFooter>
        <DialogClose as-child>
          <Button variant="secondary" class="w-full sm:w-auto">
            Compris
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
