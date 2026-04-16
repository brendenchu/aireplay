<template>
  <div id="aireplay" class="flex min-h-screen">
    <!-- Desktop sidebar -->
    <aside class="hidden md:flex w-52 shrink-0 flex-col border-r border-border p-6 pr-4 sticky top-0 h-screen overflow-y-auto">
      <h1 class="text-sm font-semibold mb-6 px-3">aireplay <Badge variant="secondary" class="text-[0.6rem] align-middle relative -top-px">v{{ version }}</Badge></h1>
      <nav aria-label="Main navigation" class="flex flex-col gap-1">
        <NavLinks />
      </nav>
    </aside>

    <!-- Mobile top bar -->
    <header class="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between border-b border-border bg-background px-4 h-12">
      <h1 class="text-sm font-semibold">aireplay <Badge variant="secondary" class="text-[0.6rem] align-middle relative -top-px">v{{ version }}</Badge></h1>
      <Sheet v-model:open="mobileOpen">
        <SheetTrigger as-child>
          <Button variant="ghost" size="icon" class="size-8" aria-label="Open menu">
            <Menu class="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" class="w-52 p-6 pr-4">
          <SheetTitle class="sr-only">Navigation</SheetTitle>
          <SheetDescription class="sr-only">App navigation menu</SheetDescription>
          <nav aria-label="Main navigation" class="flex flex-col gap-1 mt-4">
            <NavLinks @navigate="mobileOpen = false" />
          </nav>
        </SheetContent>
      </Sheet>
    </header>

    <main class="flex-1 p-6 md:p-8 max-w-[960px] mt-12 md:mt-0">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { Menu } from "lucide-vue-next";
import { ref } from "vue";
import NavLinks from "@/components/NavLinks.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const mobileOpen = ref(false);
const version = __APP_VERSION__;
</script>
