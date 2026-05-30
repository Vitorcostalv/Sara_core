export interface ModelCredit {
  model: string;
  author: string;
  license: "CC0" | "CC-BY" | "CC-BY-NC";
  sourceUrl: string;
}

// TODO: preencher conforme licenças do Poly Pizza
export const FAUNA_CREDITS: ModelCredit[] = [];
