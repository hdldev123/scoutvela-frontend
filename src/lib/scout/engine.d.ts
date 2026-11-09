export function createScout(root: HTMLElement): {
  cleanup: () => void;
  visiveis: () => { id: string; nome: string; classe: string; score: number; faixa: string; status: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};
