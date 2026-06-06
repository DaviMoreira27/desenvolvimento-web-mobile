import { consultaIdParamSchema } from "../../src/schemas/documento.schema";

describe("consultaIdParamSchema", () => {
  it("accepts a positive integer string and coerces it to a number", () => {
    const result = consultaIdParamSchema.safeParse({ id: "42" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(42);
    }
  });

  it("rejects a non-integer string", () => {
    const result = consultaIdParamSchema.safeParse({ id: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects zero", () => {
    const result = consultaIdParamSchema.safeParse({ id: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects negative integers", () => {
    const result = consultaIdParamSchema.safeParse({ id: "-1" });
    expect(result.success).toBe(false);
  });

  it("rejects a float string", () => {
    const result = consultaIdParamSchema.safeParse({ id: "1.5" });
    expect(result.success).toBe(false);
  });
});
