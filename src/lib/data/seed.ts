import type { BaseRecord, Db, Movimento } from "@/lib/types";
import { addDays, addMonths } from "@/lib/domain/dates";

/**
 * Dati demo interamente inventati. Le date sono relative al giorno del seed, così
 * scadenze e grafici restano sensati a qualunque data. Il generatore è deterministico.
 * I movimenti sono più di 10 perché servono due anni di storico per grafici e confronti.
 */
export function createSeed(today: string): Db {
  const stamp = { createdAt: `${today}T08:00:00.000Z`, updatedAt: `${today}T08:00:00.000Z` };
  const rec = <T extends object>(id: string, data: T): T & BaseRecord => ({ id, ...stamp, ...data });
  const inDays = (n: number) => addDays(today, n);
  const inMonths = (n: number) => addMonths(today, n);

  const year = Number(today.slice(0, 4));
  const movimenti: Movimento[] = [];
  const pushMov = (m: Omit<Movimento, "id" | "createdAt" | "updatedAt">) => {
    if (m.data <= today) movimenti.push(rec(`mov-${movimenti.length + 1}`, m));
  };

  // Ricorrenze mensili: dal 1° gennaio dell'anno scorso a oggi.
  for (let y = year - 1; y <= year; y++) {
    for (let mese = 1; mese <= 12; mese++) {
      const ym = `${y}-${String(mese).padStart(2, "0")}`;
      const aumento = y === year ? 150_00 : 0;
      pushMov({ tipo: "Entrata", importo: 2_480_00 + aumento, data: `${ym}-05`, descrizione: "Stipendio", categoria: "Stipendio", contoId: "con-1", metodoPagamento: "Bonifico" });
      pushMov({ tipo: "Uscita", importo: 612_40, data: `${ym}-10`, descrizione: "Rata mutuo casa", categoria: "Casa", sottocategoria: "Mutuo", contoId: "con-1", metodoPagamento: "Addebito diretto" });
      pushMov({ tipo: "Uscita", importo: 318_00 + ((mese * 37 + y) % 90) * 100, data: `${ym}-14`, descrizione: "Spesa alimentare del mese", categoria: "Alimentari", contoId: "con-1", metodoPagamento: "Carta di debito" });
      if (mese % 2 === 0)
        pushMov({ tipo: "Uscita", importo: 142_00 + (mese * 11) * 100, data: `${ym}-18`, descrizione: "Bollette luce e gas", categoria: "Utenze", contoId: "con-1", metodoPagamento: "Addebito diretto" });
      if (mese % 3 === 0)
        pushMov({ tipo: "Trasferimento", importo: 1_000_00, data: `${ym}-20`, descrizione: "Accantonamento su conto deposito", contoId: "con-1", contoDestinazioneId: "con-2", metodoPagamento: "Bonifico" });
      if (mese % 3 === 1)
        pushMov({ tipo: "Investimento", importo: 450_00, data: `${ym}-07`, descrizione: "Versamento piano di accumulo", categoria: "Investimenti", contoId: "con-1", metodoPagamento: "Bonifico" });
    }
    pushMov({ tipo: "Entrata", importo: 2_300_00, data: `${y}-12-15`, descrizione: "Tredicesima", categoria: "Stipendio", contoId: "con-1", metodoPagamento: "Bonifico" });
    pushMov({ tipo: "Uscita", importo: 540_00, data: `${y}-03-22`, descrizione: "Polizza RC auto", categoria: "Trasporti", sottocategoria: "Assicurazione", contoId: "con-1", metodoPagamento: "Carta di debito" });
  }

  pushMov({ tipo: "Uscita", importo: 1_299_00, data: `${year}-02-11`, descrizione: "Computer portatile", categoria: "Tecnologia", contoId: "con-3", metodoPagamento: "Carta di credito" });
  pushMov({ tipo: "Trasferimento", importo: 1_299_00, data: `${year}-03-01`, descrizione: "Saldo estratto conto carta", contoId: "con-1", contoDestinazioneId: "con-3", metodoPagamento: "Addebito diretto" });
  pushMov({ tipo: "Uscita", importo: 89_90, data: `${year}-02-25`, descrizione: "Cuffie (reso)", categoria: "Tecnologia", contoId: "con-3", metodoPagamento: "Carta di credito" });
  pushMov({ tipo: "Rimborso", importo: 89_90, data: `${year}-03-04`, descrizione: "Rimborso reso cuffie", categoria: "Tecnologia", contoId: "con-3", metodoPagamento: "Carta di credito" });
  pushMov({ tipo: "Uscita", importo: 980_00, data: `${year}-07-16`, descrizione: "Hotel vacanza in Sardegna", categoria: "Viaggi", contoId: "con-1", viaggioId: "via-1", metodoPagamento: "Carta di debito" });
  pushMov({ tipo: "Uscita", importo: 412_50, data: `${year}-07-18`, descrizione: "Traghetto per la Sardegna", categoria: "Viaggi", contoId: "con-1", viaggioId: "via-1", metodoPagamento: "Carta di debito" });
  pushMov({ tipo: "Uscita", importo: 268_00, data: `${year}-05-09`, descrizione: "Tagliando auto", categoria: "Trasporti", sottocategoria: "Manutenzione", contoId: "con-1", metodoPagamento: "Carta di debito" });
  pushMov({ tipo: "Uscita", importo: 145_30, data: inDays(-6), descrizione: "Abbigliamento", categoria: "Personale", contoId: "con-3", metodoPagamento: "Carta di credito" });
  pushMov({ tipo: "Uscita", importo: 76_20, data: inDays(-3), descrizione: "Cena con amici", categoria: "Tempo libero", contoId: "con-3", metodoPagamento: "Carta di credito" });
  pushMov({ tipo: "Uscita", importo: 40_00, data: inDays(-2), descrizione: "Prelievo per piccole spese", categoria: "Altro", contoId: "con-4", metodoPagamento: "Contanti" });

  return {
    meta: { version: 1, seededAt: stamp.createdAt, demo: true },
    allegati: [],
    conti: [
      rec("con-1", { nome: "Conto principale", istituto: "Banca Aurora (fittizia)", tipologia: "Conto corrente" as const, saldoIniziale: 3_500_00, dataApertura: "2019-04-12" }),
      rec("con-2", { nome: "Conto risparmio", istituto: "Banca Aurora (fittizia)", tipologia: "Conto deposito" as const, saldoIniziale: 8_000_00, dataApertura: "2021-09-01" }),
      rec("con-3", { nome: "Carta Oro", istituto: "Banca Aurora (fittizia)", tipologia: "Carta di credito" as const, saldoIniziale: 0, dataApertura: "2022-01-20", note: "Il saldo negativo è il debito da saldare a fine mese" }),
      rec("con-4", { nome: "Contanti", tipologia: "Contanti" as const, saldoIniziale: 180_00 }),
      rec("con-5", { nome: "Prepagata viaggi", istituto: "PagoFacile (fittizio)", tipologia: "Carta prepagata" as const, saldoIniziale: 250_00, dataApertura: "2024-05-03" }),
    ],
    movimenti,
    budget: [
      rec("bud-1", { categoria: "Alimentari", limiteMensile: 400_00 }),
      rec("bud-2", { categoria: "Utenze", limiteMensile: 180_00 }),
      rec("bud-3", { categoria: "Tempo libero", limiteMensile: 150_00 }),
      rec("bud-4", { categoria: "Personale", limiteMensile: 120_00 }),
      rec("bud-5", { categoria: "Trasporti", limiteMensile: 200_00 }),
    ],
    passivita: [
      rec("pas-1", { nome: "Mutuo casa Via dei Tigli", tipo: "Mutuo" as const, istituto: "Banca Aurora (fittizia)", importoIniziale: 140_000_00, residuo: 96_340_00, rata: 612_40, tasso: 2.35, dataFine: "2041-06-30", immobileId: "imm-1" }),
      rec("pas-2", { nome: "Finanziamento utilitaria", tipo: "Finanziamento auto" as const, istituto: "AutoCredito (fittizio)", importoIniziale: 9_000_00, residuo: 3_150_00, rata: 186_00, tasso: 5.9, dataFine: inMonths(17), veicoloId: "vei-1" }),
      rec("pas-3", { nome: "Prestito da un familiare", tipo: "Debito personale" as const, importoIniziale: 1_500_00, residuo: 600_00 }),
    ],
    documenti: [
      rec("doc-1", { titolo: "Carta d'identità", categoria: "Carta d'identità", numero: "CA00000AA", dataEmissione: "2017-03-15", dataScadenza: inDays(42), ente: "Comune di Borgo Fittizio" }),
      rec("doc-2", { titolo: "Passaporto", categoria: "Passaporto", numero: "YA0000000", dataEmissione: "2019-06-20", dataScadenza: inMonths(31), ente: "Questura" }),
      rec("doc-3", { titolo: "Patente di guida", categoria: "Patente", numero: "U10000000X", dataEmissione: "2018-02-01", dataScadenza: inMonths(14), ente: "Motorizzazione" }),
      rec("doc-4", { titolo: "Tessera sanitaria", categoria: "Tessera sanitaria", dataEmissione: "2021-11-10", dataScadenza: inDays(-12), ente: "Agenzia delle Entrate", note: "Scaduta: esempio di scadenza superata" }),
      rec("doc-5", { titolo: `CU ${year}`, categoria: "CU", dataEmissione: `${year}-03-16`, ente: "Datore di lavoro", tag: "fisco" }),
      rec("doc-6", { titolo: `Dichiarazione dei redditi ${year - 1}`, categoria: "Dichiarazione dei redditi", dataEmissione: `${year}-06-30`, ente: "Agenzia delle Entrate", tag: "fisco" }),
      rec("doc-7", { titolo: "Atto di acquisto casa", categoria: "Immobiliari", dataEmissione: "2018-05-21", ente: "Notaio", tag: "casa" }),
      rec("doc-8", { titolo: "Polizza casa", categoria: "Assicurativi", numero: "POL-000123", dataEmissione: `${year}-01-10`, dataScadenza: inDays(55), ente: "Assicura Sereno (fittizia)", tag: "casa, polizza" }),
    ],
    immobili: [
      rec("imm-1", { nome: "Casa Via dei Tigli", indirizzo: "Via dei Tigli 12, Borgo Fittizio", tipologia: "Appartamento", titolo: "Proprietà" as const, percentuale: 100, valoreStimato: 235_000_00, dataAcquisto: "2018-05-21", prezzoAcquisto: 190_000_00 }),
      rec("imm-2", { nome: "Box auto", indirizzo: "Via dei Tigli 12, Borgo Fittizio", tipologia: "Box", titolo: "Proprietà" as const, percentuale: 100, valoreStimato: 18_000_00, dataAcquisto: "2020-02-11", prezzoAcquisto: 15_000_00 }),
      rec("imm-3", { nome: "Quota casa di famiglia", indirizzo: "Contrada Ulivi 3, Paese Inventato", tipologia: "Casa indipendente", titolo: "Proprietà" as const, percentuale: 25, valoreStimato: 120_000_00, dataAcquisto: "2015-10-01" }),
      rec("imm-4", { nome: "Monolocale in affitto (studio)", indirizzo: "Corso Esempio 40, Città Demo", tipologia: "Monolocale", titolo: "Locazione" as const, percentuale: 100, valoreStimato: 0, note: "In locazione: non entra nel patrimonio" }),
      rec("imm-5", { nome: "Cantina", indirizzo: "Via dei Tigli 12, Borgo Fittizio", tipologia: "Altro", titolo: "Proprietà" as const, percentuale: 100, valoreStimato: 5_000_00 }),
    ],
    speseCasa: [
      rec("sca-1", { immobileId: "imm-1", tipo: "IMU", descrizione: "IMU saldo box", importo: 88_00, data: `${year}-12-01`, scadenza: `${year}-12-16`, stato: "Da pagare" as const, fornitore: "Comune di Borgo Fittizio" }),
      rec("sca-2", { immobileId: "imm-1", tipo: "TARI", descrizione: "TARI seconda rata", importo: 104_00, data: inDays(-5), scadenza: inDays(11), stato: "Da pagare" as const, fornitore: "Comune di Borgo Fittizio" }),
      rec("sca-3", { immobileId: "imm-1", tipo: "Condominio", descrizione: "Spese condominiali trimestre", importo: 210_00, data: `${year}-04-02`, stato: "Pagata" as const, fornitore: "Studio Amministrazioni Demo" }),
      rec("sca-4", { immobileId: "imm-1", tipo: "Manutenzione", descrizione: "Revisione caldaia", importo: 95_00, data: `${year}-09-12`, stato: "Pagata" as const, fornitore: "Termoservice Demo" }),
      rec("sca-5", { immobileId: "imm-1", tipo: "Internet", descrizione: "Fibra casa, bimestre", importo: 54_00, data: `${year}-10-01`, stato: "Pagata" as const, fornitore: "RetePiù (fittizia)" }),
      rec("sca-6", { immobileId: "imm-3", tipo: "Manutenzione", descrizione: "Quota rifacimento tetto", importo: 1_250_00, data: `${year - 1}-06-15`, stato: "Pagata" as const, fornitore: "Edilizia Demo" }),
      rec("sca-7", { immobileId: "imm-4", tipo: "Altro", descrizione: "Affitto studio, deposito cauzionale", importo: 650_00, data: `${year - 1}-02-01`, stato: "Pagata" as const }),
    ],
    veicoli: [
      rec("vei-1", { marca: "Velocar", modello: "City 1.2", targa: "AA000AA", alimentazione: "Benzina", dataImmatricolazione: "2020-06-15", chilometraggio: 68_400, valoreStimato: 8_500_00, proprieta: "Proprietà" as const, scadenzaAssicurazione: inDays(19), scadenzaBollo: inDays(74), scadenzaRevisione: inDays(-3) }),
      rec("vei-2", { marca: "Motoluna", modello: "Scooter 125", targa: "AA00000", alimentazione: "Benzina", dataImmatricolazione: "2017-04-02", chilometraggio: 21_300, valoreStimato: 1_400_00, proprieta: "Proprietà" as const, scadenzaAssicurazione: inMonths(5), scadenzaBollo: inMonths(7) }),
      rec("vei-3", { marca: "Elettra", modello: "E-Move", targa: "ZZ000ZZ", alimentazione: "Elettrica", dataImmatricolazione: "2024-03-10", chilometraggio: 19_000, valoreStimato: 21_000_00, proprieta: "Noleggio" as const, scadenzaAssicurazione: inMonths(16), note: "A noleggio: non entra nel patrimonio" }),
    ],
    interventi: [
      rec("int-1", { veicoloId: "vei-1", tipo: "Tagliando", data: `${year}-05-09`, chilometraggio: 63_200, descrizione: "Tagliando 60.000 km", costo: 268_00, officina: "Officina Demo" }),
      rec("int-2", { veicoloId: "vei-1", tipo: "Assicurazione", data: `${year}-03-22`, descrizione: "Polizza RC annuale", costo: 540_00, officina: "Assicura Sereno (fittizia)" }),
      rec("int-3", { veicoloId: "vei-1", tipo: "Bollo", data: `${year}-01-28`, descrizione: "Bollo annuale", costo: 172_00 }),
      rec("int-4", { veicoloId: "vei-1", tipo: "Gomme", data: `${year}-04-11`, chilometraggio: 62_000, descrizione: "Cambio gomme estive", costo: 60_00, officina: "Gommista Demo" }),
      rec("int-5", { veicoloId: "vei-1", tipo: "Carburante", data: inDays(-9), chilometraggio: 68_100, descrizione: "Pieno", costo: 62_00 }),
      rec("int-6", { veicoloId: "vei-2", tipo: "Manutenzione", data: `${year}-06-03`, chilometraggio: 20_900, descrizione: "Cambio olio", costo: 75_00, officina: "Officina Demo" }),
      rec("int-7", { veicoloId: "vei-1", tipo: "Multa", data: `${year - 1}-10-12`, descrizione: "Sosta vietata", costo: 42_00 }),
    ],
    eventiSalute: [
      rec("sal-1", { tipo: "Visita", titolo: "Visita medico di base", data: inDays(-60), medico: "Dott.ssa Demo", costo: 0 }),
      rec("sal-2", { tipo: "Esame", titolo: "Esami del sangue di routine", data: `${year}-03-14`, struttura: "Laboratorio Demo", costo: 38_50, prossimoControllo: inMonths(4) }),
      rec("sal-3", { tipo: "Visita", titolo: "Visita oculistica", data: `${year}-02-20`, medico: "Dott. Esempio", struttura: "Centro Vista Demo", costo: 90_00, prossimoControllo: inDays(26) }),
      rec("sal-4", { tipo: "Vaccinazione", titolo: "Richiamo vaccinale", data: `${year - 1}-10-05`, struttura: "Azienda sanitaria", costo: 0 }),
      rec("sal-5", { tipo: "Visita", titolo: "Pulizia dentale", data: `${year}-05-30`, medico: "Studio Dentistico Demo", costo: 80_00, prossimoControllo: inMonths(6) }),
    ],
    farmaci: [
      rec("far-1", { nome: "Integratore (esempio)", prescrittoDa: "Dott.ssa Demo", posologia: "Come da indicazioni del medico", dataInizio: inDays(-30), dataFine: inDays(30) }),
      rec("far-2", { nome: "Colliri (esempio)", prescrittoDa: "Dott. Esempio", posologia: "Come da indicazioni del medico", dataInizio: inDays(-200) }),
    ],
    abbonamenti: [
      rec("abb-1", { nome: "StreamBox Premium", fornitore: "StreamBox (fittizio)", categoria: "Streaming", costo: 15_99, frequenza: "Mensile" as const, dataInizio: "2022-03-01", dataRinnovo: inDays(8), metodoPagamento: "Carta di credito", stato: "Attivo" as const }),
      rec("abb-2", { nome: "Musica+", fornitore: "Musica+ (fittizio)", categoria: "Musica", costo: 10_99, frequenza: "Mensile" as const, dataInizio: "2021-01-15", dataRinnovo: inDays(21), metodoPagamento: "Carta di credito", stato: "Attivo" as const }),
      rec("abb-3", { nome: "Telefono mobile", fornitore: "TelCom Demo", categoria: "Telefonia", costo: 9_99, frequenza: "Mensile" as const, dataInizio: "2020-07-01", dataRinnovo: inDays(14), metodoPagamento: "Addebito diretto", stato: "Attivo" as const }),
      rec("abb-4", { nome: "Fibra casa", fornitore: "RetePiù (fittizia)", categoria: "Internet", costo: 54_00, frequenza: "Bimestrale" as const, dataInizio: "2019-11-01", dataRinnovo: inDays(36), dataScadenza: inMonths(9), metodoPagamento: "Addebito diretto", stato: "Attivo" as const }),
      rec("abb-5", { nome: "Palestra Centro Forma", fornitore: "Centro Forma Demo", categoria: "Palestra", costo: 180_00, frequenza: "Trimestrale" as const, dataInizio: "2024-01-08", dataRinnovo: inDays(47), metodoPagamento: "Carta di debito", stato: "Attivo" as const }),
      rec("abb-6", { nome: "Archivio cloud", fornitore: "NuvolaSicura (fittizia)", categoria: "Servizi cloud", costo: 29_99, frequenza: "Annuale" as const, dataInizio: "2023-02-14", dataRinnovo: inMonths(3), metodoPagamento: "Carta di credito", stato: "Attivo" as const }),
      rec("abb-7", { nome: "Rivista digitale", fornitore: "Edicola Demo", categoria: "Altro", costo: 6_99, frequenza: "Mensile" as const, dataInizio: "2022-09-01", metodoPagamento: "Carta di credito", stato: "Disdetto" as const, note: "Disdetto: escluso dai totali" }),
    ],
    beni: [
      rec("ben-1", { nome: "Computer portatile", categoria: "Informatica", marca: "TechNova", modello: "Air 14", dataAcquisto: `${year}-02-11`, prezzo: 1_299_00, valoreAttuale: 1_050_00, scadenzaGaranzia: inMonths(15), seriale: "SN-0000-0001", negozio: "Elettromondo Demo", movimentoId: movimenti.find((m) => m.descrizione === "Computer portatile")?.id }),
      rec("ben-2", { nome: "Televisore 55 pollici", categoria: "Elettronica", marca: "Visio", modello: "V55", dataAcquisto: `${year - 2}-11-24`, prezzo: 749_00, valoreAttuale: 380_00, scadenzaGaranzia: inDays(23), seriale: "SN-0000-0002", negozio: "Elettromondo Demo" }),
      rec("ben-3", { nome: "Lavatrice", categoria: "Elettrodomestici", marca: "Lavamax", modello: "L8", dataAcquisto: `${year - 3}-05-02`, prezzo: 520_00, valoreAttuale: 200_00, negozio: "Casa Più Demo" }),
      rec("ben-4", { nome: "Divano tre posti", categoria: "Arredamento", dataAcquisto: "2021-09-18", prezzo: 1_150_00, valoreAttuale: 450_00, negozio: "Arredo Demo" }),
      rec("ben-5", { nome: "Orologio automatico", categoria: "Orologi", marca: "Tempora", modello: "Classic", dataAcquisto: "2022-12-20", prezzo: 890_00, valoreAttuale: 800_00, seriale: "SN-0000-0005" }),
      rec("ben-6", { nome: "Bicicletta", categoria: "Attrezzature", marca: "Pedala", modello: "Urban", dataAcquisto: `${year}-04-16`, prezzo: 620_00, valoreAttuale: 560_00, scadenzaGaranzia: inMonths(17), negozio: "Sport Demo" }),
    ],
    agenda: [
      rec("age-1", { titolo: "Rinnovare la carta d'identità", tipo: "Commissione", data: inDays(9), ora: "10:30", priorita: "Alta" as const, categoria: "Burocrazia", stato: "Da fare" as const, ricorrenza: "Nessuna" }),
      rec("age-2", { titolo: "Prenotare la revisione auto", tipo: "Attività", data: inDays(2), priorita: "Alta" as const, categoria: "Auto", stato: "Da fare" as const, ricorrenza: "Nessuna" }),
      rec("age-3", { titolo: "Appuntamento commercialista", tipo: "Appuntamento", data: inDays(16), ora: "15:00", priorita: "Media" as const, categoria: "Fisco", stato: "Da fare" as const, ricorrenza: "Nessuna" }),
      rec("age-4", { titolo: "Pagare spese condominiali", tipo: "Promemoria", data: inDays(33), priorita: "Media" as const, categoria: "Casa", stato: "Da fare" as const, ricorrenza: "Ogni trimestre" }),
      rec("age-5", { titolo: "Rivedere il budget mensile", tipo: "Attività", data: inDays(-4), priorita: "Bassa" as const, categoria: "Finanze", stato: "Completata" as const, ricorrenza: "Ogni mese" }),
      rec("age-6", { titolo: "Cena di compleanno", tipo: "Ricorrenza", data: inDays(24), ora: "20:00", priorita: "Bassa" as const, categoria: "Famiglia", stato: "Da fare" as const, ricorrenza: "Ogni anno" }),
    ],
    viaggi: [
      rec("via-1", { destinazione: "Sardegna", dataPartenza: `${year}-07-20`, dataRitorno: `${year}-07-30`, partecipanti: "2 adulti", budget: 1_600_00, trasporti: "Traghetto andata e ritorno", alloggio: "Hotel sul mare", stato: "Concluso" as const }),
      rec("via-2", { destinazione: "Lisbona", dataPartenza: inDays(52), dataRitorno: inDays(56), partecipanti: "2 adulti", budget: 900_00, trasporti: "Volo diretto", alloggio: "Appartamento in centro", stato: "Prenotato" as const }),
      rec("via-3", { destinazione: "Dolomiti", dataPartenza: inMonths(4), dataRitorno: addDays(inMonths(4), 5), partecipanti: "4 adulti", budget: 1_200_00, trasporti: "Auto", stato: "Pianificato" as const }),
      rec("via-4", { destinazione: "Vienna", dataPartenza: `${year - 1}-04-18`, dataRitorno: `${year - 1}-04-22`, partecipanti: "2 adulti", budget: 700_00, trasporti: "Treno notturno", alloggio: "Hotel", stato: "Concluso" as const }),
      rec("via-5", { destinazione: "Fine settimana a Matera", dataPartenza: inMonths(2), dataRitorno: addDays(inMonths(2), 2), budget: 350_00, stato: "Pianificato" as const }),
    ],
    contatti: [
      rec("cnt-1", { nome: "Giulia", cognome: "Esempio", telefono: "333 0000001", email: "giulia@example.com", categoria: "Familiari", compleanno: `1990-${inDays(24).slice(5)}` }),
      rec("cnt-2", { nome: "Marco", cognome: "Fittizio", telefono: "333 0000002", email: "marco@example.com", categoria: "Amici", compleanno: "1988-03-14" }),
      rec("cnt-3", { nome: "Laura", cognome: "Demo", telefono: "02 0000003", email: "studio@example.com", categoria: "Commercialista", azienda: "Studio Demo Fiscale", indirizzo: "Corso Esempio 10, Città Demo" }),
      rec("cnt-4", { nome: "Paolo", cognome: "Campione", telefono: "02 0000004", email: "legale@example.com", categoria: "Avvocato", azienda: "Studio Legale Demo" }),
      rec("cnt-5", { nome: "Dott.ssa", cognome: "Demo", telefono: "02 0000005", categoria: "Medico", azienda: "Ambulatorio Demo" }),
      rec("cnt-6", { nome: "Luca", cognome: "Prova", telefono: "333 0000006", categoria: "Artigiani", azienda: "Termoservice Demo", note: "Manutenzione caldaia" }),
      rec("cnt-7", { nome: "Officina", cognome: "Demo", telefono: "02 0000007", categoria: "Fornitori", azienda: "Officina Demo", indirizzo: "Via Motori 8, Borgo Fittizio" }),
    ],
    investimenti: [
      rec("inv-1", { nome: "ETF azionario globale", tipo: "ETF", istituto: "Banca Aurora (fittizia)", capitaleInvestito: 10_800_00, valoreAttuale: 12_460_00, dataValutazione: inDays(-5) }),
      rec("inv-2", { nome: "BTP decennale", tipo: "Obbligazioni", istituto: "Banca Aurora (fittizia)", capitaleInvestito: 5_000_00, valoreAttuale: 5_120_00, dataValutazione: inDays(-5) }),
      rec("inv-3", { nome: "Fondo pensione", tipo: "Previdenza", istituto: "Previdenza Demo", capitaleInvestito: 9_000_00, valoreAttuale: 10_240_00, dataValutazione: `${year}-09-30` }),
      rec("inv-4", { nome: "Polizza di risparmio", tipo: "Polizza", istituto: "Assicura Sereno (fittizia)", capitaleInvestito: 3_000_00, valoreAttuale: 3_075_00, dataValutazione: `${year}-06-30` }),
      rec("inv-5", { nome: "Buoni fruttiferi", tipo: "Obbligazioni", capitaleInvestito: 2_000_00, valoreAttuale: 2_090_00, dataValutazione: `${year}-06-30` }),
    ],
    obiettivi: [
      rec("obi-1", { nome: "Fondo emergenze", importoTarget: 15_000_00, importoAttuale: 12_000_00, dataTarget: inMonths(8) }),
      rec("obi-2", { nome: "Viaggio in Giappone", importoTarget: 5_000_00, importoAttuale: 1_800_00, dataTarget: inMonths(20) }),
      rec("obi-3", { nome: "Auto nuova", importoTarget: 12_000_00, importoAttuale: 3_500_00, dataTarget: inMonths(36) }),
      rec("obi-4", { nome: "Estinzione prestito familiare", importoTarget: 1_500_00, importoAttuale: 900_00, dataTarget: inMonths(6) }),
      rec("obi-5", { nome: "Corso di specializzazione", importoTarget: 2_000_00, importoAttuale: 2_000_00, dataTarget: inMonths(-2) }),
    ],
  };
}
