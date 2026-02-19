import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const xlsxReadFile = XLSX.readFile;
const xlsxUtils = XLSX.utils;
const SSF = XLSX.SSF;

// --- File paths ---------------------------------------------------------------
const FILE_PRODUKTY = path.resolve('C:/Users/pwywi/Dysk/Pobrane/Produkty z AWU.xlsx');
const FILE_BAZA_CEN = path.resolve('C:/Users/pwywi/Dysk/Pobrane/Baza Cen Produktów Używanych.xlsx');
const OUTPUT_DIR = path.resolve('C:/Users/pwywi/Dysk/Dokumenty/Nauka/awu-admin/src/mock/data');

// --- Location mapping ---------------------------------------------------------
const LOCATION_MAP: Record<string, number> = {
  'Gdansk': 1,
  'Katowice': 2,
  'Krakow': 3,
  'Lodz': 4,
  'Poznan': 5,
  'Warszawa': 6,
  'Centrala': 8,
};

// --- Helpers ------------------------------------------------------------------
function trim(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function parseExcelDate(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    const date = SSF.parse_date_code(val);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, '0');
      const d = String(date.d).padStart(2, '0');
      return y + '-' + m + '-' + d;
    }
  }
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return isoMatch[1] + '-' + isoMatch[2].padStart(2, '0') + '-' + isoMatch[3].padStart(2, '0');
  }
  const euMatch = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (euMatch) {
    return euMatch[3] + '-' + euMatch[2].padStart(2, '0') + '-' + euMatch[1].padStart(2, '0');
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function parseRating(val: unknown): number {
  if (val === null || val === undefined || val === '') return 5;
  if (typeof val === 'number' && val >= 1 && val <= 10) {
    return Math.round(val);
  }
  if (typeof val === 'number') {
    const date = SSF.parse_date_code(val);
    if (date && date.m >= 1 && date.m <= 12) {
      return Math.min(Math.max(date.m, 1), 10);
    }
  }
  const s = String(val).trim();
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const month = parseInt(isoMatch[2], 10);
    return Math.min(Math.max(month, 1), 10);
  }
  const euMatch = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (euMatch) {
    const month = parseInt(euMatch[2], 10);
    return Math.min(Math.max(month, 1), 10);
  }
  const n = parseFloat(s);
  if (!isNaN(n) && n >= 1 && n <= 10) return Math.round(n);
  return 5;
}

function parsePrice(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return Math.round(val * 100) / 100;
  const s = String(val).replace(/[^\d.,-]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}

function mapLocationId(locationName: string): number {
  const normalized = locationName.trim();
  for (const [key, id] of Object.entries(LOCATION_MAP)) {
    if (key.toLowerCase() === normalized.toLowerCase()) return id;
  }
  const lower = normalized.toLowerCase();
  if (lower.includes('gda')) return 1;
  if (lower.includes('katow')) return 2;
  if (lower.includes('krak')) return 3;
  if (lower.includes('odz') || lower.includes('lod')) return 4;
  if (lower.includes('pozn')) return 5;
  if (lower.includes('warsz')) return 6;
  if (lower.includes('centr')) return 8;
  return 6;
}

function generateTrackingNumber(): string {
  let digits = '';
  for (let i = 0; i < 10; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  return 'DPD' + digits;
}

function generateCommunications(appraisalNumber: string, createdAt: string | null): any[] {
  const msgs: any[] = [];
  const baseDate = createdAt ? new Date(createdAt) : new Date('2024-01-15');
  const count = 2 + Math.floor(Math.random() * 2);
  const templates = [
    { from: 'system', subject: 'Wycena utworzona', body: 'Wycena ' + appraisalNumber + ' zostala utworzona i oczekuje na przesylke.' },
    { from: 'operator', subject: 'Przesylka odebrana', body: 'Otrzymalismy przesylke do wyceny ' + appraisalNumber + '. Rozpoczynamy ekspertyze.' },
    { from: 'system', subject: 'Ekspertyza zakonczona', body: 'Ekspertyza dla wyceny ' + appraisalNumber + ' zostala zakonczona.' },
    { from: 'operator', subject: 'Aktualizacja statusu', body: 'Status wyceny ' + appraisalNumber + ' zostal zaktualizowany.' },
  ];
  for (let i = 0; i < count && i < templates.length; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i * 2 + Math.floor(Math.random() * 3));
    msgs.push({
      id: 'comm-' + appraisalNumber + '-' + (i + 1),
      date: date.toISOString().slice(0, 10),
      ...templates[i],
    });
  }
  return msgs;
}

// --- Status mapping -----------------------------------------------------------
let statusDistributionCounter = 0;
function mapStatus(bazaStatus: string | null, bazaDecision: string | null): number {
  const status = (bazaStatus || '').trim().toLowerCase();
  const decision = (bazaDecision || '').trim().toLowerCase();
  const isSold =
    status.includes('przyj\u0119ty do sprzeda\u017cy') ||
    status.includes('przyjety do sprzedazy') ||
    status.includes('sprzeda\u017c') ||
    status.includes('sprzedaz') ||
    status.includes('odes\u0142any do centrali') ||
    status.includes('odeslany do centrali');
  const isAccepted =
    decision.includes('zaakceptowana') ||
    status.includes('zaakceptowana');
  const isRejected =
    decision.includes('odrzucona') ||
    status.includes('odrzucona');
  const isReturned =
    status.includes('zwr\u00f3cony') ||
    status.includes('zwrocony') ||
    status.includes('zwrot');
  if (isReturned) return 13; // ZWROT_DO_KLIENTA
  if (isRejected) return 7; // ODRZUCONA

  // Use a counter-based approach to spread items across all statuses for demo variety
  statusDistributionCounter++;
  const mod = statusDistributionCounter % 13;
  if (mod === 0) return 1;  // NOWA
  if (mod === 1) return 2;  // W_TRAKCIE_WERYFIKACJI
  if (mod === 2) return 3;  // ZWERYFIKOWANA
  if (mod === 3) return 4;  // SKORYGOWANA
  if (mod === 4) return 5;  // OCZEKUJE_NA_DECYZJE
  if (mod === 5) return 6;  // ZAAKCEPTOWANA
  if (mod === 6) return 8;  // UMOWA_W_PRZYGOTOWANIU
  if (mod === 7) return 9;  // UMOWA_PODPISANA
  if (mod === 8) return 10; // REALIZACJA_FINANSOWA
  if (mod === 9) return 11; // ZAKONCZONA
  if (mod === 10) return 11; // ZAKONCZONA
  if (mod === 11) return 11; // ZAKONCZONA
  return 12; // PRZEKAZANA_DO_CENTRALI
}

// --- Read Excel files ---------------------------------------------------------
console.log('Reading Excel files...');

console.log('  Reading: ' + FILE_PRODUKTY);
const wbProdukty = xlsxReadFile(FILE_PRODUKTY, { codepage: 65001 });
const wsProdukty = wbProdukty.Sheets[wbProdukty.SheetNames[0]];
const dataProdukty: any[] = xlsxUtils.sheet_to_json(wsProdukty, { defval: '' });
console.log('  Rows in Produkty z AWU: ' + dataProdukty.length);

console.log('  Reading: ' + FILE_BAZA_CEN);
const wbBaza = xlsxReadFile(FILE_BAZA_CEN, { codepage: 65001 });
const wsBaza = wbBaza.Sheets[wbBaza.SheetNames[0]];
const dataBazaRaw: any[][] = xlsxUtils.sheet_to_json(wsBaza, { header: 1, defval: '' });
console.log('  Raw rows in Baza Cen: ' + dataBazaRaw.length);

// Find the header row in Baza Cen
let bazaHeaderIdx = 0;
for (let i = 0; i < Math.min(5, dataBazaRaw.length); i++) {
  const row = dataBazaRaw[i];
  if (row && row.some((cell: any) => String(cell).includes('Numer wyceny'))) {
    bazaHeaderIdx = i;
    break;
  }
}
console.log('  Baza Cen header row index: ' + bazaHeaderIdx);

const bazaHeaders: string[] = dataBazaRaw[bazaHeaderIdx].map((h: any) => trim(h));
console.log('  Baza Cen headers: ' + bazaHeaders.join(' | '));

const dataBaza: any[] = [];
for (let i = bazaHeaderIdx + 1; i < dataBazaRaw.length; i++) {
  const row = dataBazaRaw[i];
  if (!row || row.length === 0) continue;
  const obj: any = {};
  for (let j = 0; j < bazaHeaders.length; j++) {
    obj[bazaHeaders[j]] = row[j] !== undefined ? row[j] : '';
  }
  dataBaza.push(obj);
}
console.log('  Parsed Baza Cen rows: ' + dataBaza.length);

if (dataProdukty.length > 0) {
  console.log('');
  console.log('  Produkty columns: ' + Object.keys(dataProdukty[0]).join(' | '));
}
if (dataBaza.length > 0) {
  console.log('  Baza Cen columns: ' + Object.keys(dataBaza[0]).join(' | '));
}

// --- Helper to find column by partial match -----------------------------------
function findCol(row: any, ...candidates: string[]): string | null {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const exact = keys.find(k => k === candidate);
    if (exact) return exact;
  }
  for (const candidate of candidates) {
    const ci = keys.find(k => k.toLowerCase() === candidate.toLowerCase());
    if (ci) return ci;
  }
  for (const candidate of candidates) {
    const partial = keys.find(k => k.toLowerCase().includes(candidate.toLowerCase()));
    if (partial) return partial;
  }
  return null;
}

// --- Build column maps --------------------------------------------------------
const sampleProd = dataProdukty[0] || {};
const sampleBaza = dataBaza[0] || {};

const COL_P_CREATED     = findCol(sampleProd, 'Data utworzenia wyceny', 'Data utworzenia');
const COL_P_VERTO       = findCol(sampleProd, 'ID Verto');
const COL_P_NAME        = findCol(sampleProd, 'Nazwa produktu');
const COL_P_SERIAL      = findCol(sampleProd, 'Numer seryjny');
const COL_P_EMAIL       = findCol(sampleProd, 'E-mail klienta', 'Email klienta');
const COL_P_CONTRACT_NO = findCol(sampleProd, 'Numer umowy');
const COL_P_CONTRACT_DT = findCol(sampleProd, 'Data umowy');
const COL_P_PRICE_TR    = findCol(sampleProd, 'Cena przelew');
const COL_P_PRICE_GC    = findCol(sampleProd, 'Cena karta podarunkowa', 'Cena karta');
const COL_P_RATING      = findCol(sampleProd, 'Ocena');
const COL_P_ACC         = findCol(sampleProd, 'Akcesoria');
const COL_P_ADD_ACC     = findCol(sampleProd, 'Akcesoria dodatkowe');
const COL_P_NOTES       = findCol(sampleProd, 'Uwagi');
const COL_P_DOC_TYPE    = findCol(sampleProd, 'Rodzaj dokumentu');
const COL_P_APPRAISAL   = findCol(sampleProd, 'Numer wyceny');

const COL_B_EXPERTISE   = findCol(sampleBaza, 'Wynik ekspertyzy');
const COL_B_STATUS      = findCol(sampleBaza, 'Status');
const COL_B_DECISION    = findCol(sampleBaza, 'Decyzja klienta');
const COL_B_LOCATION    = findCol(sampleBaza, 'Lokalizacja');
const COL_B_OPERATOR    = findCol(sampleBaza, 'Inspektor');
const COL_B_EXP_DATE    = findCol(sampleBaza, 'Data ekspertyzy');
const COL_B_APPRAISAL   = findCol(sampleBaza, 'Numer wyceny');
const COL_B_NAME        = findCol(sampleBaza, 'Nazwa produktu');
const COL_B_VERTO       = findCol(sampleBaza, 'ID Verto');
const COL_B_SERIAL      = findCol(sampleBaza, 'Numer seryjny');
const COL_B_EMAIL       = findCol(sampleBaza, 'E-mail klienta', 'Email klienta');

console.log('');
console.log('  Column mapping (Produkty):');
console.log('    Data utworzenia -> ' + COL_P_CREATED);
console.log('    ID Verto -> ' + COL_P_VERTO);
console.log('    Nazwa produktu -> ' + COL_P_NAME);
console.log('    Numer seryjny -> ' + COL_P_SERIAL);
console.log('    E-mail klienta -> ' + COL_P_EMAIL);
console.log('    Numer umowy -> ' + COL_P_CONTRACT_NO);
console.log('    Data umowy -> ' + COL_P_CONTRACT_DT);
console.log('    Cena przelew -> ' + COL_P_PRICE_TR);
console.log('    Cena karta -> ' + COL_P_PRICE_GC);
console.log('    Ocena -> ' + COL_P_RATING);
console.log('    Akcesoria -> ' + COL_P_ACC);
console.log('    Akcesoria dodatkowe -> ' + COL_P_ADD_ACC);
console.log('    Uwagi -> ' + COL_P_NOTES);
console.log('    Rodzaj dokumentu -> ' + COL_P_DOC_TYPE);
console.log('    Numer wyceny -> ' + COL_P_APPRAISAL);
console.log('');
console.log('  Column mapping (Baza Cen):');
console.log('    Wynik ekspertyzy -> ' + COL_B_EXPERTISE);
console.log('    Status -> ' + COL_B_STATUS);
console.log('    Decyzja klienta -> ' + COL_B_DECISION);
console.log('    Lokalizacja -> ' + COL_B_LOCATION);
console.log('    Inspektor -> ' + COL_B_OPERATOR);
console.log('    Data ekspertyzy -> ' + COL_B_EXP_DATE);
console.log('    Numer wyceny -> ' + COL_B_APPRAISAL);

// --- Index Baza Cen by appraisalNumber ----------------------------------------
interface BazaEntry {
  expertiseResult: string;
  status: string;
  customerDecision: string;
  locationName: string;
  locationId: number;
  operatorName: string;
  expertiseDate: string | null;
  productName: string;
  idVerto: string;
  serialNumber: string;
  customerEmail: string;
}

const bazaByAppraisal = new Map<string, BazaEntry[]>();

for (const row of dataBaza) {
  const appraisalNum = trim(row[COL_B_APPRAISAL!]);
  if (!appraisalNum) continue;

  const locName = trim(row[COL_B_LOCATION!]);
  const entry: BazaEntry = {
    expertiseResult: trim(row[COL_B_EXPERTISE!]),
    status: trim(row[COL_B_STATUS!]),
    customerDecision: trim(row[COL_B_DECISION!]),
    locationName: locName,
    locationId: mapLocationId(locName),
    operatorName: trim(row[COL_B_OPERATOR!]),
    expertiseDate: parseExcelDate(row[COL_B_EXP_DATE!]),
    productName: trim(row[COL_B_NAME!]),
    idVerto: trim(row[COL_B_VERTO!]),
    serialNumber: trim(row[COL_B_SERIAL!]),
    customerEmail: trim(row[COL_B_EMAIL!]),
  };

  if (!bazaByAppraisal.has(appraisalNum)) {
    bazaByAppraisal.set(appraisalNum, []);
  }
  bazaByAppraisal.get(appraisalNum)!.push(entry);
}

console.log('');
console.log('  Baza Cen: ' + bazaByAppraisal.size + ' unique appraisal numbers');

// --- Group Produkty by appraisalNumber ----------------------------------------
interface ProductRow {
  createdAt: string | null;
  idVerto: string;
  productName: string;
  serialNumber: string;
  customerEmail: string;
  contractNumber: string;
  contractDate: string | null;
  priceTransfer: number | null;
  priceGiftCard: number | null;
  rating: number;
  accessories: string;
  additionalAccessories: string;
  notes: string;
  documentType: string;
  appraisalNumber: string;
}

const produktyByAppraisal = new Map<string, ProductRow[]>();

for (const row of dataProdukty) {
  const appraisalNum = trim(row[COL_P_APPRAISAL!]);
  if (!appraisalNum) continue;

  const product: ProductRow = {
    createdAt: parseExcelDate(row[COL_P_CREATED!]),
    idVerto: trim(row[COL_P_VERTO!]),
    productName: trim(row[COL_P_NAME!]),
    serialNumber: trim(row[COL_P_SERIAL!]),
    customerEmail: trim(row[COL_P_EMAIL!]),
    contractNumber: trim(row[COL_P_CONTRACT_NO!]),
    contractDate: parseExcelDate(row[COL_P_CONTRACT_DT!]),
    priceTransfer: parsePrice(row[COL_P_PRICE_TR!]),
    priceGiftCard: parsePrice(row[COL_P_PRICE_GC!]),
    rating: parseRating(row[COL_P_RATING!]),
    accessories: trim(row[COL_P_ACC!]),
    additionalAccessories: trim(row[COL_P_ADD_ACC!]),
    notes: trim(row[COL_P_NOTES!]),
    documentType: trim(row[COL_P_DOC_TYPE!]),
    appraisalNumber: appraisalNum,
  };

  if (!produktyByAppraisal.has(appraisalNum)) {
    produktyByAppraisal.set(appraisalNum, []);
  }
  produktyByAppraisal.get(appraisalNum)!.push(product);
}

console.log('  Produkty: ' + produktyByAppraisal.size + ' unique appraisal numbers');

// --- Rating definitions -------------------------------------------------------
const RATINGS: Record<number, { id: number; name: string; description: string }> = {
  10: { id: 10, name: '10', description: 'Fabrycznie nowy' },
  9:  { id: 9,  name: '9',  description: 'Stan idealny' },
  8:  { id: 8,  name: '8',  description: 'Bardzo dobry' },
  7:  { id: 7,  name: '7',  description: 'Dobry' },
  6:  { id: 6,  name: '6',  description: 'Dostateczny' },
  5:  { id: 5,  name: '5',  description: 'Widoczne ślady użytkowania' },
};

function makeRating(val: number) {
  return RATINGS[val] || RATINGS[5];
}

// --- Parse accessories string into structured data ----------------------------
function parseAccessories(accStr: string): any[] {
  if (!accStr) return [];
  return accStr.split(',').map((s, i) => ({
    id: i + 1,
    price: 0,
    data: { id: i + 1, name: s.trim() }
  })).filter(a => a.data.name.length > 0);
}

// --- Random client name generator (mock) -------------------------------------
const firstNames = ['Jan', 'Anna', 'Piotr', 'Maria', 'Tomasz', 'Katarzyna', 'Michał', 'Ewa', 'Krzysztof', 'Agnieszka', 'Andrzej', 'Monika', 'Paweł', 'Joanna', 'Marek', 'Magdalena', 'Robert', 'Aleksandra', 'Adam', 'Barbara'];
const lastNames = ['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur', 'Kwiatkowski', 'Krawczyk', 'Piotrowski', 'Grabowski', 'Nowakowski', 'Pawłowski', 'Michalski'];
function randomName(seed: number): string {
  return firstNames[seed % firstNames.length] + ' ' + lastNames[(seed * 7) % lastNames.length];
}

// --- Operator mapping ---------------------------------------------------------
const OPERATOR_IDS: Record<string, number> = {};
let operatorIdCounter = 100;
function getOperatorId(name: string): number {
  if (!name) return 1;
  if (!OPERATOR_IDS[name]) {
    OPERATOR_IDS[name] = operatorIdCounter++;
  }
  return OPERATOR_IDS[name];
}

// --- Build appraisals ---------------------------------------------------------
const allAppraisalNumbers = Array.from(produktyByAppraisal.keys());
const selectedNumbers = allAppraisalNumbers.slice(0, 250);

console.log('');
console.log('  Building ' + selectedNumbers.length + ' appraisals...');

const appraisalListItems: any[] = [];
const appraisalDetails: any[] = [];
let idCounter = 1;

for (const appraisalNum of selectedNumbers) {
  const products = produktyByAppraisal.get(appraisalNum)!;
  const bazaEntries = bazaByAppraisal.get(appraisalNum) || [];

  const firstProduct = products[0];
  const firstBaza = bazaEntries[0] || null;

  const statusCode = firstBaza
    ? mapStatus(firstBaza.status, firstBaza.customerDecision)
    : 1;

  const locationId = firstBaza ? firstBaza.locationId : 6;
  const locationName = firstBaza ? firstBaza.locationName : 'Warszawa';
  const operatorName = firstBaza ? firstBaza.operatorName : '';
  const expertiseDate = firstBaza ? firstBaza.expertiseDate : null;
  const trackingNumber = generateTrackingNumber();
  const clientName = randomName(idCounter);
  // Anonymize email - never use real customer emails
  const emailDomains = ['gmail.com', 'wp.pl', 'op.pl', 'onet.pl', 'interia.pl', 'o2.pl'];
  const customerEmail = clientName.toLowerCase().replace(/\s+/g, '.').replace(/[ąćęłńóśźż]/g, c => {
    const map: Record<string, string> = { 'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z' };
    return map[c] || c;
  }) + '@' + emailDomains[idCounter % emailDomains.length];
  const createdAt = firstProduct.createdAt || '2024-01-01';

  // Build products matching AppraisalProduct type
  const appraisalProducts = products.map((p, idx) => {
    const matchingBaza = bazaEntries.find(
      b => (b.idVerto && b.idVerto === p.idVerto) ||
           (b.serialNumber && b.serialNumber === p.serialNumber) ||
           (b.productName && b.productName === p.productName)
    ) || bazaEntries[idx] || firstBaza;

    const declaredRating = makeRating(p.rating);
    const verifiedRatingVal = matchingBaza ? Math.max(5, Math.min(10, p.rating + (Math.random() > 0.6 ? -1 : 0))) : null;
    const hasPriceInDb = Math.random() > 0.3;

    return {
      id: idCounter * 1000 + idx + 1,
      data: {
        id: idCounter * 1000 + idx + 1,
        erpIndex: p.idVerto || undefined,
        name: p.productName,
        offerType: 1 as 1 | 2 | 3 | 4,
      },
      idVerto: p.idVerto,
      serialNumber: p.serialNumber || null,
      declaredRating,
      verifiedRating: verifiedRatingVal !== null ? makeRating(Math.round(verifiedRatingVal)) : null,
      declaredAccessories: parseAccessories(p.accessories),
      verifiedAccessories: matchingBaza ? parseAccessories(p.accessories) : null,
      accessoryComment: p.additionalAccessories || '',
      priceTransfer: p.priceTransfer,
      priceGiftCard: p.priceGiftCard,
      priceAllegro: null,
      priceMinForClient: null,
      priceFrontAfterExpertise: null,
      hasPriceInDatabase: hasPriceInDb,
      internalNote: p.notes || '',
      warranty: false,
      hasBox: Math.random() > 0.5,
      virtualProductName: null,
    };
  });

  const totalPriceTransfer = appraisalProducts.reduce((sum, p) => sum + (p.priceTransfer || 0), 0);
  const totalPriceGiftCard = appraisalProducts.reduce((sum, p) => sum + (p.priceGiftCard || 0), 0);

  // Build communications matching CommunicationMessage type
  const comms = generateCommunications(appraisalNum, createdAt).map((c, i) => ({
    id: idCounter * 100 + i + 1,
    appraisalId: idCounter,
    type: c.from === 'system' ? 'system' : 'email_sent',
    from: c.from === 'system' ? 'system@cyfrowe.pl' : (operatorName || 'operator') + '@cyfrowe.pl',
    to: customerEmail,
    subject: c.subject,
    body: c.body,
    timestamp: c.date + 'T10:00:00Z',
    status: 'sent' as const,
  }));

  // Build contracts (for completed appraisals)
  const contracts: any[] = [];
  if (firstProduct.contractNumber) {
    contracts.push({
      id: idCounter * 10 + 1,
      appraisalId: idCounter,
      type: 'umowa_kupna',
      subtype: 'physical_person',
      number: firstProduct.contractNumber,
      date: firstProduct.contractDate || createdAt,
      status: statusCode >= 9 ? 'signed' : 'generated',
      documentUrl: null,
      createdBy: operatorName || 'System',
      createdAt: firstProduct.contractDate || createdAt,
    });
  }

  // Build shipments
  const shipments: any[] = [{
    id: idCounter * 10 + 1,
    appraisalId: idCounter,
    type: 'incoming_courier',
    trackingNumber: trackingNumber,
    inpostReturnNumber: null,
    carrier: 'dpd' as const,
    status: statusCode >= 3 ? 'delivered' : 'in_transit',
    address: null,
    createdAt: createdAt + 'T08:00:00Z',
    updatedAt: createdAt + 'T08:00:00Z',
  }];

  // Build audit log
  const auditLog: any[] = [
    {
      id: idCounter * 100 + 1,
      timestamp: createdAt + 'T09:00:00Z',
      operatorId: 1,
      operatorName: 'System',
      locationName: locationName,
      action: 'Utworzenie wyceny',
      details: 'Wycena ' + appraisalNum + ' została utworzona',
    }
  ];
  if (operatorName) {
    auditLog.push({
      id: idCounter * 100 + 2,
      timestamp: (expertiseDate || createdAt) + 'T11:00:00Z',
      operatorId: getOperatorId(operatorName),
      operatorName: operatorName,
      locationName: locationName,
      action: 'Weryfikacja produktów',
      details: 'Produkty zostały zweryfikowane przez ' + operatorName,
    });
  }

  // Build version
  const versions: any[] = [{
    versionNumber: 1,
    createdAt: createdAt + 'T09:00:00Z',
    createdBy: 'System',
    createdByOperatorId: 1,
    reason: 'Wycena początkowa',
    products: appraisalProducts,
    totalPriceTransfer,
    totalPriceGiftCard,
  }];

  const customerDecision = firstBaza ? firstBaza.customerDecision || null : null;
  const expertiseResult = firstBaza ? firstBaza.expertiseResult || null : null;

  // AppraisalListItem
  appraisalListItems.push({
    id: idCounter,
    appraisalNumber: appraisalNum,
    createdAt,
    status: statusCode,
    trackingNumber,
    clientName,
    clientEmail: customerEmail,
    productCount: appraisalProducts.length,
    locationName,
    assignedOperatorName: operatorName || null,
    totalPriceTransfer,
    totalPriceGiftCard,
    customerDecision,
  });

  // Full Appraisal detail
  appraisalDetails.push({
    id: idCounter,
    appraisalNumber: appraisalNum,
    createdAt,
    expiryDate: null,
    status: statusCode,
    trackingNumber,
    client: {
      id: idCounter,
      name: clientName,
      email: customerEmail,
      phoneNumber: '+48' + (600000000 + idCounter * 137).toString().slice(0, 9),
      isCompany: false,
    },
    locationId,
    locationName,
    assignedOperatorId: operatorName ? getOperatorId(operatorName) : null,
    assignedOperatorName: operatorName || null,
    agreementType: { id: 1, name: 'Umowa kupna-sprzedaży' },
    paymentType: { id: 1, name: 'Przelew bankowy' },
    collectionType: { id: 1, name: 'Kurier DPD' },
    products: appraisalProducts,
    versions,
    contracts,
    communications: comms,
    shipments,
    auditLog,
    offerClientComment: '',
    customerDecision,
    expertiseResult,
    expertiseDate,
    totalPriceTransfer,
    totalPriceGiftCard,
  });

  idCounter++;
}

// --- Status distribution summary ----------------------------------------------
const statusCounts: Record<number, number> = {};
for (const a of appraisalListItems) {
  statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
}
console.log('');
console.log('  Status distribution:');
const STATUS_LABELS: Record<number, string> = {
  1: 'NOWA', 2: 'W_TRAKCIE_WERYFIKACJI', 3: 'ZWERYFIKOWANA', 4: 'SKORYGOWANA',
  5: 'OCZEKUJE_NA_DECYZJE', 6: 'ZAAKCEPTOWANA', 7: 'ODRZUCONA', 8: 'UMOWA_W_PRZYGOTOWANIU',
  9: 'UMOWA_PODPISANA', 10: 'REALIZACJA_FINANSOWA', 11: 'ZAKONCZONA',
  12: 'PRZEKAZANA_DO_CENTRALI', 13: 'ZWROT_DO_KLIENTA'
};
for (const [code, count] of Object.entries(statusCounts).sort(([a], [b]) => Number(a) - Number(b))) {
  console.log('    ' + code + ' (' + (STATUS_LABELS[Number(code)] || 'UNKNOWN') + '): ' + count);
}

// --- Write output files -------------------------------------------------------
const outputList = path.join(OUTPUT_DIR, 'appraisals.json');
fs.writeFileSync(outputList, JSON.stringify(appraisalListItems, null, 2), 'utf-8');
console.log('');
console.log('  Written: ' + outputList);

const outputDetail = path.join(OUTPUT_DIR, 'appraisals-detail.json');
fs.writeFileSync(outputDetail, JSON.stringify(appraisalDetails, null, 2), 'utf-8');
console.log('  Written: ' + outputDetail);

console.log('');
console.log('  Total appraisals: ' + appraisalListItems.length);
console.log('  Total products: ' + appraisalDetails.reduce((sum: number, a: any) => sum + a.products.length, 0));
console.log('  Total communications: ' + appraisalDetails.reduce((sum: number, a: any) => sum + a.communications.length, 0));
console.log('  Total contracts: ' + appraisalDetails.reduce((sum: number, a: any) => sum + a.contracts.length, 0));
console.log('');
console.log('Done!');
