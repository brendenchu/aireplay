import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import ProviderBadge from "../components/ProviderBadge.vue";
import { PROVIDER_IDS, PROVIDER_NAMES } from "../types/provider";

describe("ProviderBadge", () => {
  for (const id of PROVIDER_IDS) {
    test(`renders ${id} with its accent class and display name`, () => {
      const wrapper = mount(ProviderBadge, { props: { provider: id } });
      expect(wrapper.text()).toContain(PROVIDER_NAMES[id]);
      expect(wrapper.classes()).toContain(id);
    });
  }

  test("small prop yields compact sizing", () => {
    const wrapper = mount(ProviderBadge, {
      props: { provider: "claude-code", small: true },
    });
    expect(wrapper.classes().some((c) => c.includes("h-4"))).toBe(true);
  });
});
