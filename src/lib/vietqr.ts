export interface VietQrBank {
  bin: string;
  shortName: string;
  name: string;
}

export const VIETQR_BANKS: VietQrBank[] = [
  { bin: "970436", shortName: "VCB", name: "Vietcombank" },
  { bin: "970422", shortName: "MB", name: "MB Bank" },
  { bin: "970407", shortName: "TCB", name: "Techcombank" },
  { bin: "970416", shortName: "ACB", name: "ACB" },
  { bin: "970418", shortName: "BIDV", name: "BIDV" },
  { bin: "970415", shortName: "ICB", name: "VietinBank" },
  { bin: "970432", shortName: "VPB", name: "VPBank" },
  { bin: "970423", shortName: "TPB", name: "TPBank" },
  { bin: "970403", shortName: "STB", name: "Sacombank" },
  { bin: "970405", shortName: "VBA", name: "Agribank" },
  { bin: "970441", shortName: "VIB", name: "VIB" },
  { bin: "970437", shortName: "HDB", name: "HDBank" },
  { bin: "970443", shortName: "SHB", name: "SHB" },
  { bin: "970426", shortName: "MSB", name: "MSB" },
  { bin: "970448", shortName: "OCB", name: "OCB" },
  { bin: "970449", shortName: "LPB", name: "LPBank" },
  { bin: "970431", shortName: "EIB", name: "Eximbank" },
  { bin: "970440", shortName: "SEAB", name: "SeABank" },
  { bin: "970428", shortName: "NAB", name: "Nam A Bank" },
  { bin: "970425", shortName: "ABB", name: "ABBank" },
  { bin: "970409", shortName: "BAB", name: "Bac A Bank" },
  { bin: "970419", shortName: "NCB", name: "NCB" },
  { bin: "970452", shortName: "KLB", name: "KienlongBank" },
  { bin: "963388", shortName: "TIMO", name: "Timo Digital Bank" },
  { bin: "546034", shortName: "CAKE", name: "CAKE by VPBank" },
  { bin: "546035", shortName: "UBANK", name: "Ubank by VPBank" },
];

export function findBankByBin(bin: string | null | undefined): VietQrBank | undefined {
  if (!bin) return undefined;
  return VIETQR_BANKS.find((b) => b.bin === bin);
}

export function buildVietQrUrl(params: {
  bankBin: string;
  accountNo: string;
  accountName?: string | null;
  amount?: number;
  addInfo?: string;
}): string {
  const cleanAccount = params.accountNo.trim().replace(/\s+/g, "");
  const query = new URLSearchParams();
  if (params.amount && params.amount > 0) {
    query.set("amount", String(Math.round(params.amount)));
  }
  if (params.addInfo?.trim()) {
    query.set("addInfo", params.addInfo.trim());
  }
  if (params.accountName?.trim()) {
    query.set("accountName", params.accountName.trim().toUpperCase());
  }
  const qs = query.toString();
  return `https://img.vietqr.io/image/${encodeURIComponent(
    params.bankBin.trim()
  )}-${encodeURIComponent(cleanAccount)}-compact2.png${qs ? `?${qs}` : ""}`;
}
