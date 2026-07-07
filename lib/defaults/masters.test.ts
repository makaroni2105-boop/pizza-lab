import { describe, expect, it } from "vitest";

import {
  buildMixerKey,
  getFlourById,
  getMixerMaster,
  getMixerModel,
  getMixerTypeEntry,
  getRegionalMethod,
} from "./masters";

describe("masters", () => {
  it("loads mixer master with all mixer types", () => {
    const master = getMixerMaster();
    expect(master.version).toBe("0.1.0");
    expect(master.types.spiral.avgFrictionC).toBe(14);
    expect(master.types.unknown.lowSpeedMin).toBe(3);
  });

  it("finds mixer model by id", () => {
    const model = getMixerModel("spiral-spiral-55");
    expect(model?.frictionC).toBe(14);
    expect(model?.type).toBe("spiral");
  });

  it("returns undefined for unknown flour id", () => {
    expect(getFlourById("nonexistent-flour")).toBeUndefined();
  });

  it("finds flour by id from master", () => {
    const flour = getFlourById("caputo-cuoco");
    expect(flour?.wValue).toBe(300);
    expect(flour?.proteinPercent).toBe(13.5);
  });

  it("returns regional method presets", () => {
    const napoli = getRegionalMethod("napoli");
    expect(napoli.hydrationPct).toBe(65);
    expect(napoli.targetDdtC).toBe(24);
  });

  it("uses spiral averages for unknown mixer type entry", () => {
    const unknown = getMixerTypeEntry("unknown");
    const spiral = getMixerTypeEntry("spiral");
    expect(unknown.avgFrictionC).toBe(spiral.avgFrictionC);
    expect(unknown.lowRpm).toBe(spiral.lowRpm);
  });

  it("builds mixer key from type and model id", () => {
    expect(buildMixerKey("spiral", "spiral-spiral-55")).toBe("spiral:spiral-spiral-55");
    expect(buildMixerKey("hand", null)).toBe("hand:");
  });
});
