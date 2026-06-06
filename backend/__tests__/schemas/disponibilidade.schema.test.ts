import {
  createDisponibilidadeSchema,
  slotsLivresQuerySchema,
} from "../../src/schemas/disponibilidade.schema";

describe("createDisponibilidadeSchema", () => {
  it("accepts a valid diaSemana and horarioInicio", () => {
    const result = createDisponibilidadeSchema.safeParse({
      diaSemana: "segunda",
      horarioInicio: "08:00",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.diaSemana).toBe("segunda");
      expect(result.data.horarioInicio).toBe("08:00");
    }
  });

  it("accepts all valid diaSemana values", () => {
    const dias = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    for (const dia of dias) {
      const result = createDisponibilidadeSchema.safeParse({
        diaSemana: dia,
        horarioInicio: "09:30",
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects an invalid diaSemana value", () => {
    const result = createDisponibilidadeSchema.safeParse({
      diaSemana: "monday",
      horarioInicio: "08:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.diaSemana).toBeDefined();
    }
  });

  it("rejects missing diaSemana and produces a field error", () => {
    const result = createDisponibilidadeSchema.safeParse({
      horarioInicio: "08:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.diaSemana).toBeDefined();
    }
  });

  it("rejects horarioInicio not matching HH:MM format", () => {
    const result = createDisponibilidadeSchema.safeParse({
      diaSemana: "terca",
      horarioInicio: "8:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.horarioInicio).toBeDefined();
    }
  });

  it("rejects horarioInicio with seconds appended", () => {
    const result = createDisponibilidadeSchema.safeParse({
      diaSemana: "terca",
      horarioInicio: "08:00:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing horarioInicio", () => {
    const result = createDisponibilidadeSchema.safeParse({
      diaSemana: "quarta",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.horarioInicio).toBeDefined();
    }
  });
});

describe("slotsLivresQuerySchema", () => {
  it("accepts valid medicoId (as number) and data", () => {
    const result = slotsLivresQuerySchema.safeParse({
      medicoId: 5,
      data: "2026-06-15",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.medicoId).toBe(5);
      expect(result.data.data).toBe("2026-06-15");
    }
  });

  it("coerces medicoId from string to number", () => {
    const result = slotsLivresQuerySchema.safeParse({
      medicoId: "3",
      data: "2026-06-15",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.medicoId).toBe(3);
    }
  });

  it("rejects non-numeric medicoId", () => {
    const result = slotsLivresQuerySchema.safeParse({
      medicoId: "abc",
      data: "2026-06-15",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.medicoId).toBeDefined();
    }
  });

  it("rejects medicoId of zero", () => {
    const result = slotsLivresQuerySchema.safeParse({
      medicoId: "0",
      data: "2026-06-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative medicoId", () => {
    const result = slotsLivresQuerySchema.safeParse({
      medicoId: "-1",
      data: "2026-06-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects malformed date string", () => {
    const result = slotsLivresQuerySchema.safeParse({
      medicoId: "1",
      data: "15/06/2026",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.data).toBeDefined();
    }
  });

  it("rejects missing data parameter", () => {
    const result = slotsLivresQuerySchema.safeParse({
      medicoId: "1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.data).toBeDefined();
    }
  });
});

describe("day-of-week mapping (UTC)", () => {
  const daysOfWeek = [
    "domingo",
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
  ] as const;

  function mapDayToEnum(data: string): string {
    const dayIndex = new Date(data + "T00:00:00.000Z").getUTCDay();
    return daysOfWeek[dayIndex]!;
  }

  it("maps Sunday (2026-06-07) to domingo", () => {
    expect(mapDayToEnum("2026-06-07")).toBe("domingo");
  });

  it("maps Monday (2026-06-08) to segunda", () => {
    expect(mapDayToEnum("2026-06-08")).toBe("segunda");
  });

  it("maps Tuesday (2026-06-09) to terca", () => {
    expect(mapDayToEnum("2026-06-09")).toBe("terca");
  });

  it("maps Wednesday (2026-06-10) to quarta", () => {
    expect(mapDayToEnum("2026-06-10")).toBe("quarta");
  });

  it("maps Thursday (2026-06-11) to quinta", () => {
    expect(mapDayToEnum("2026-06-11")).toBe("quinta");
  });

  it("maps Friday (2026-06-12) to sexta", () => {
    expect(mapDayToEnum("2026-06-12")).toBe("sexta");
  });

  it("maps Saturday (2026-06-13) to sabado", () => {
    expect(mapDayToEnum("2026-06-13")).toBe("sabado");
  });

  it("does not shift day near midnight UTC boundary", () => {
    const day = new Date("2026-06-08T00:00:00.000Z").getUTCDay();
    expect(day).toBe(1);
  });
});
