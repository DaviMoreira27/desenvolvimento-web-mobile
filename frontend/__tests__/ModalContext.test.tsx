import React from "react";
import { act, renderHook } from "@testing-library/react-native";
import { ModalProvider, ModalContext } from "../hooks/ModalContext";
import { useContext } from "react";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ModalProvider, null, children);
}

describe("ModalContext", () => {
  it("starts with openModal false", async () => {
    const { result, unmount } = await renderHook(() => useContext(ModalContext), { wrapper });
    expect(result.current.openModal).toBe(false);
    unmount();
  });

  it("starts with consultasVersion 0", async () => {
    const { result, unmount } = await renderHook(() => useContext(ModalContext), { wrapper });
    expect(result.current.consultasVersion).toBe(0);
    unmount();
  });

  it("setOpenModal updates openModal to true", async () => {
    const { result, unmount } = await renderHook(() => useContext(ModalContext), { wrapper });

    await act(async () => {
      result.current.setOpenModal(true);
    });

    expect(result.current.openModal).toBe(true);
    unmount();
  });

  it("setOpenModal can toggle back to false", async () => {
    const { result, unmount } = await renderHook(() => useContext(ModalContext), { wrapper });

    await act(async () => {
      result.current.setOpenModal(true);
    });

    await act(async () => {
      result.current.setOpenModal(false);
    });

    expect(result.current.openModal).toBe(false);
    unmount();
  });

  it("bumpConsultasVersion increments consultasVersion by 1", async () => {
    const { result, unmount } = await renderHook(() => useContext(ModalContext), { wrapper });

    await act(async () => {
      result.current.bumpConsultasVersion();
    });

    expect(result.current.consultasVersion).toBe(1);
    unmount();
  });

  it("bumpConsultasVersion accumulates across multiple calls", async () => {
    const { result, unmount } = await renderHook(() => useContext(ModalContext), { wrapper });

    await act(async () => {
      result.current.bumpConsultasVersion();
    });

    await act(async () => {
      result.current.bumpConsultasVersion();
    });

    await act(async () => {
      result.current.bumpConsultasVersion();
    });

    expect(result.current.consultasVersion).toBe(3);
    unmount();
  });

  it("exposes setOpenModal and bumpConsultasVersion as functions", async () => {
    const { result, unmount } = await renderHook(() => useContext(ModalContext), { wrapper });

    expect(typeof result.current.setOpenModal).toBe("function");
    expect(typeof result.current.bumpConsultasVersion).toBe("function");
    unmount();
  });
});
