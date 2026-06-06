import { createContext, useState } from "react";

type ModalContextType = {
  openModal: boolean;
  setOpenModal: (open: boolean) => void;
  consultasVersion: number;
  bumpConsultasVersion: () => void;
};

export const ModalContext = createContext<ModalContextType>({
  openModal: false,
  setOpenModal: () => {},
  consultasVersion: 0,
  bumpConsultasVersion: () => {},
});

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [openModal, setOpenModal] = useState(false);
  const [consultasVersion, setConsultasVersion] = useState(0);

  function bumpConsultasVersion() {
    setConsultasVersion((v) => v + 1);
  }

  return (
    <ModalContext.Provider value={{ openModal, setOpenModal, consultasVersion, bumpConsultasVersion }}>
      {children}
    </ModalContext.Provider>
  );
}
