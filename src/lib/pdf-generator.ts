import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Convert image to base64 for PDF embedding
export const imageToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg"));
      } else {
        reject(new Error("Could not get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
};

interface PaiementData {
  id: string;
  date_paiement: string;
  montant: number;
  type: string;
  mois_concerne: string | null;
  notes: string | null;
  locataire: {
    nom: string;
    telephone: string;
    email?: string;
    adresse?: string;
  };
  bien: {
    nom: string;
    adresse: string;
    type: string;
  };
  contrat: {
    loyer_mensuel: number;
  };
  nombreMois?: number;
  moisDetails?: { mois: string; montant: number }[];
}

// Format number with separators and FCFA
const formatMontant = (montant: number): string => {
  const parts = montant.toString().split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return intPart + " FCFA";
};

// Format number simple (sans FCFA)
const formatNumber = (montant: number): string => {
  const parts = montant.toString().split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return intPart;
};

// Generate receipt number: PANPAS001/MM/YY
const generateReceiptNumber = (paiementId: string, date: string): string => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  const seq = parseInt(paiementId.replace(/-/g, '').slice(0, 6), 16) % 999 + 1;
  const seqStr = String(seq).padStart(3, '0');
  return `PANPAS${seqStr}/${month}/${year}`;
};

// Truncate text to fit width
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 2) + "..";
};

export type PrintOptions = {
  format?: "a5" | "a4" | "custom";
  orientation?: "portrait" | "landscape";
  margin?: number;
  customSize?: [number, number];
};

export const generateReceiptPDF = async (
  paiement: PaiementData,
  logoBase64?: string,
  options?: PrintOptions,
) => {
  const orientation = options?.orientation || "portrait";
  let formatOption: any = [148, 210];
  if (options?.format === "a4") formatOption = "a4";
  if (options?.format === "a5") formatOption = [148, 210];
  if (options?.format === "custom" && options?.customSize) formatOption = options.customSize;

  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: formatOption,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = typeof options?.margin === "number" ? options!.margin : (options?.format === "a4" ? 15 : 10);
  const contentWidth = pageWidth - 2 * margin;
  let currentY = margin;

  doc.setFont("helvetica", "normal");

  let nombreMois = paiement.nombreMois || 1;
  const loyerMensuel = paiement.contrat?.loyer_mensuel || paiement.montant;

  if (!paiement.nombreMois && paiement.contrat?.loyer_mensuel > 0 && paiement.montant > 0) {
    nombreMois = Math.max(1, Math.round(paiement.montant / paiement.contrat.loyer_mensuel));
  }

  // HEADER
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", margin, currentY, 14, 14);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("PANPAS IMMOBILIER", logoBase64 ? margin + 17 : margin, currentY + 5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Gestion Immobiliere", logoBase64 ? margin + 17 : margin, currentY + 9);
  doc.text("+228 92 18 40 65", logoBase64 ? margin + 17 : margin, currentY + 12);

  const receiptNumber = generateReceiptNumber(paiement.id, paiement.date_paiement);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("FACTURE", pageWidth - margin, currentY + 4, { align: "right" });

  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(`N°: ${receiptNumber}`, pageWidth - margin, currentY + 8, { align: "right" });
  doc.text(`Date: ${new Date(paiement.date_paiement).toLocaleDateString("fr-FR")}`, pageWidth - margin, currentY + 12, { align: "right" });

  currentY += 16;

  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  // LOCATAIRE + BIEN
  const colWidth = (contentWidth - 4) / 2;

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, colWidth, 18, "F");
  doc.setDrawColor(220, 220, 220);
  doc.rect(margin, currentY, colWidth, 18);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("LOCATAIRE", margin + 2, currentY + 4);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(truncateText(paiement.locataire.nom, 28), margin + 2, currentY + 8);
  doc.text(`Tel: ${paiement.locataire.telephone}`, margin + 2, currentY + 12);
  if (paiement.locataire.adresse) {
    doc.setFontSize(6);
    doc.text(truncateText(paiement.locataire.adresse, 30), margin + 2, currentY + 16);
  }

  const col2X = margin + colWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.rect(col2X, currentY, colWidth, 18, "F");
  doc.setDrawColor(220, 220, 220);
  doc.rect(col2X, currentY, colWidth, 18);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("BIEN LOUÉ", col2X + 2, currentY + 4);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(truncateText(paiement.bien.nom, 28), col2X + 2, currentY + 8);
  doc.setFontSize(6);
  doc.text(truncateText(paiement.bien.adresse, 30), col2X + 2, currentY + 12);
  doc.text(`Type: ${paiement.bien.type}`, col2X + 2, currentY + 16);

  currentY += 21;

  // TYPE PAIEMENT
  const typeLabels: { [key: string]: string } = {
    loyer: "PAIEMENT DE LOYER",
    avance: "AVANCE SUR LOYER",
    caution: "DEPOT DE GARANTIE",
    arrieres: "ARRIERES DE LOYER"
  };

  doc.setFillColor(41, 128, 185);
  doc.rect(margin, currentY, contentWidth, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(typeLabels[paiement.type] || "PAIEMENT", pageWidth / 2, currentY + 4, { align: "center" });
  doc.setTextColor(0, 0, 0);

  currentY += 8;

  // TABLE
  const tableData: string[][] = [];

  if (paiement.type === "loyer" || paiement.type === "avance" || paiement.type === "arrieres") {
    if (paiement.moisDetails && paiement.moisDetails.length > 0) {
      paiement.moisDetails.forEach((detail, index) => {
        const moisLabel = new Date(detail.mois).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        tableData.push([
          String(index + 1),
          moisLabel.charAt(0).toUpperCase() + moisLabel.slice(1),
          formatMontant(detail.montant)
        ]);
      });
    } else if (paiement.mois_concerne && nombreMois >= 1) {
      const startDate = new Date(paiement.mois_concerne);
      for (let i = 0; i < nombreMois; i++) {
        const moisDate = new Date(startDate);
        moisDate.setMonth(moisDate.getMonth() + i);
        const moisLabel = moisDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        tableData.push([
          String(i + 1),
          moisLabel.charAt(0).toUpperCase() + moisLabel.slice(1),
          formatMontant(loyerMensuel)
        ]);
      }
    } else {
      tableData.push(["1", "Loyer mensuel", formatMontant(paiement.montant)]);
    }
  } else if (paiement.type === "caution") {
    tableData.push(["1", "Depot de garantie", formatMontant(paiement.montant)]);
  }

  const fontSize = tableData.length > 8 ? 6 : 7;
  const col0Width = Math.max(10, Math.round(contentWidth * 0.09));
  const col2Width = Math.max(24, Math.round(contentWidth * 0.28));
  const col1Width = contentWidth - col0Width - col2Width - 2;

  autoTable(doc, {
    startY: currentY,
    head: [["N°", "Periode / Description", "Montant"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [52, 73, 94],
      fontSize: fontSize,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 1.5,
    },
    bodyStyles: {
      fontSize: fontSize,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: col0Width, halign: "center" },
      1: { cellWidth: col1Width, halign: "left" },
      2: { cellWidth: col2Width, halign: "right" },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    tableWidth: contentWidth,
  });

  currentY = (doc as any).lastAutoTable.finalY + 2;

  // TOTAL
  doc.setFillColor(46, 204, 113);
  doc.rect(margin, currentY, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL PAYE:", margin + 3, currentY + 5);
  doc.text(formatMontant(paiement.montant), pageWidth - margin - 3, currentY + 5, { align: "right" });
  doc.setTextColor(0, 0, 0);

  currentY += 10;

  // PERIODE
  if (nombreMois > 1 && (paiement.type === "loyer" || paiement.type === "avance" || paiement.type === "arrieres")) {
    const startMois = paiement.mois_concerne ? new Date(paiement.mois_concerne) : new Date();
    const endMois = new Date(startMois);
    endMois.setMonth(endMois.getMonth() + nombreMois - 1);

    doc.setFillColor(240, 248, 255);
    doc.rect(margin, currentY, contentWidth, 7, "F");
    doc.setDrawColor(41, 128, 185);
    doc.rect(margin, currentY, contentWidth, 7);

    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text("PERIODE:", margin + 2, currentY + 4);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    const periodeText = `${startMois.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })} → ${endMois.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })} (${nombreMois} mois)`;
    doc.text(periodeText, margin + 18, currentY + 4);

    currentY += 8;
  }

  // PROCHAIN PAIEMENT
  if ((paiement.type === "loyer" || paiement.type === "avance") && paiement.mois_concerne) {
    const nextMonth = new Date(paiement.mois_concerne);
    nextMonth.setMonth(nextMonth.getMonth() + nombreMois);
    nextMonth.setDate(10);

    doc.setFillColor(255, 248, 230);
    doc.rect(margin, currentY, contentWidth, 7, "F");
    doc.setDrawColor(255, 152, 0);
    doc.rect(margin, currentY, contentWidth, 7);

    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 100, 0);
    doc.text("PROCHAIN PAIEMENT:", margin + 2, currentY + 4);
    doc.setFont("helvetica", "normal");
    const nextPaymentText = `AVANT LE 10 ${nextMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
    doc.text(nextPaymentText, pageWidth - margin - 2, currentY + 4, { align: "right" });
    doc.setTextColor(0, 0, 0);

    currentY += 8;
  }

  // FOOTER
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  
  if (currentY < pageHeight - 15) {
    doc.text("Ce document fait foi de paiement. Merci. - PANPAS IMMOBILIER", 
             pageWidth / 2, pageHeight - 5, { align: "center" });
  } else {
    doc.text("Ce document fait foi de paiement. Merci. - PANPAS IMMOBILIER", 
             pageWidth / 2, currentY + 5, { align: "center" });
  }

  const fileName = `Facture_${paiement.locataire.nom.replace(/\s+/g, "_")}_${new Date(paiement.date_paiement).toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};

// ========== RAPPORT PROPRIETAIRE (Format inspiré du document Word) ==========
interface ProprietaireReportData {
  proprietaire: {
    id: string;
    nom: string;
    telephone?: string;
    email?: string;
  };
  biens: Array<{
    id: string;
    nom: string;
    adresse: string;
    type: string;
    loyer_mensuel: number;
    commission_pourcentage: number;
    statut: string;
  }>;
  locataires: Array<{
    nom: string;
    bien_nom: string;
    loyer: number;
    loyers_payes: string[];
    montant_paye: number;
    arrieres: number;
    caution_payee: number;
  }>;
  depenses: Array<{
    description: string;
    montant: number;
    categorie: string;
    bien_nom: string;
  }>;
  totals: {
    nombre_chambres: number;
    nombre_libres: number;
    total_loyers: number;
    total_arrieres: number;
    total_cautions: number;
    total_depenses: number;
    commission: number;
    somme_a_verser: number;
  };
}

export const generateProprietaireRapportPDF = async (
  data: ProprietaireReportData,
  selectedMonth: string,
  logoBase64?: string
) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let currentY = margin;

  const monthDate = new Date(selectedMonth + "-01");
  const monthLabel = monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // HEADER avec style du document Word
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 35, "F");

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", margin, 8, 20, 20);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("AGENCE IMMOBILIERE PANPAS", logoBase64 ? margin + 25 : margin, 16);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Gestion Immobiliere Professionnelle", logoBase64 ? margin + 25 : margin, 23);
  doc.text("+228 92 18 40 65 | www.panpasimmobilier.tech", logoBase64 ? margin + 25 : margin, 29);

  currentY = 42;

  // TITRE DU RAPPORT
  doc.setFillColor(52, 73, 94);
  doc.rect(margin, currentY, contentWidth, 12, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`SITUATION DU MOIS DE ${monthLabel.toUpperCase()}`, pageWidth / 2, currentY + 8, { align: "center" });

  currentY += 16;

  // NOM DU PROPRIETAIRE
  doc.setFillColor(236, 240, 241);
  doc.rect(margin, currentY, contentWidth, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(44, 62, 80);
  doc.text(`PROPRIETAIRE: ${data.proprietaire.nom.toUpperCase()}`, pageWidth / 2, currentY + 7, { align: "center" });

  currentY += 14;

  // STATISTIQUES CHAMBRES
  const statWidth = contentWidth / 2 - 2;
  
  doc.setFillColor(46, 204, 113);
  doc.roundedRect(margin, currentY, statWidth, 14, 2, 2, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Nombre de biens", margin + statWidth / 2, currentY + 5, { align: "center" });
  doc.setFontSize(14);
  doc.text(String(data.totals.nombre_chambres).padStart(2, '0'), margin + statWidth / 2, currentY + 11, { align: "center" });

  doc.setFillColor(231, 76, 60);
  doc.roundedRect(margin + statWidth + 4, currentY, statWidth, 14, 2, 2, "F");
  doc.setFontSize(9);
  doc.text("Biens libres", margin + statWidth + 4 + statWidth / 2, currentY + 5, { align: "center" });
  doc.setFontSize(14);
  doc.text(String(data.totals.nombre_libres).padStart(2, '0'), margin + statWidth + 4 + statWidth / 2, currentY + 11, { align: "center" });

  currentY += 18;

  // TABLEAU DES ENTREES (Locataires)
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("LES ENTRÉES", margin, currentY);
  currentY += 4;

  const locatairesData = data.locataires.map(loc => [
    loc.nom,
    formatNumber(loc.loyer),
    loc.loyers_payes.length > 0 ? loc.loyers_payes.join(", ") : "-",
    loc.montant_paye > 0 ? formatNumber(loc.montant_paye) : "-",
    loc.arrieres > 0 ? formatNumber(loc.arrieres) : "-",
    loc.caution_payee > 0 ? formatNumber(loc.caution_payee) : "-"
  ]);

  // Ajouter ligne total
  locatairesData.push([
    "TOTAL",
    formatNumber(data.locataires.reduce((sum, l) => sum + l.loyer, 0)),
    "",
    formatNumber(data.totals.total_loyers),
    formatNumber(data.totals.total_arrieres),
    formatNumber(data.totals.total_cautions)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Noms des locataires", "Prix", "Loyer payé", "Montant", "Arriérés", "Cautions"]],
    body: locatairesData,
    theme: "grid",
    headStyles: {
      fillColor: [52, 73, 94],
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 40 },
      1: { halign: "right", cellWidth: 22 },
      2: { halign: "center", cellWidth: 35 },
      3: { halign: "right", cellWidth: 25 },
      4: { halign: "right", cellWidth: 25 },
      5: { halign: "right", cellWidth: 25 },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    didParseCell: function (hookData) {
      if (hookData.row.index === locatairesData.length - 1) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [220, 220, 220];
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // TABLEAU DES DEPENSES
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(231, 76, 60);
  doc.text("LES DÉPENSES", margin, currentY);
  currentY += 4;

  const depensesData = data.depenses.map(dep => [
    dep.description,
    formatNumber(dep.montant)
  ]);

  // Ajouter commission
  depensesData.push(["COMMISSION AGENCE", formatNumber(data.totals.commission)]);
  
  // Total dépenses
  depensesData.push(["TOTAL DES DÉPENSES", formatNumber(data.totals.total_depenses + data.totals.commission)]);
  
  // Somme à verser
  depensesData.push([`SOMME À VERSER (${formatNumber(data.totals.total_loyers)} - ${formatNumber(data.totals.total_depenses + data.totals.commission)})`, formatNumber(data.totals.somme_a_verser)]);

  autoTable(doc, {
    startY: currentY,
    head: [["Motifs", "Montants"]],
    body: depensesData,
    theme: "grid",
    headStyles: {
      fillColor: [231, 76, 60],
      fontSize: 9,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 120 },
      1: { halign: "right", cellWidth: 40 },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: { fillColor: [255, 250, 250] },
    didParseCell: function (hookData) {
      const lastIndex = depensesData.length - 1;
      if (hookData.row.index === lastIndex) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [46, 204, 113];
        hookData.cell.styles.textColor = [255, 255, 255];
      } else if (hookData.row.index === lastIndex - 1 || hookData.row.index === lastIndex - 2) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [220, 220, 220];
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // RESUME FINANCIER
  const boxWidth = contentWidth / 3 - 4;
  
  doc.setFillColor(46, 204, 113);
  doc.roundedRect(margin, currentY, boxWidth, 18, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL ENCAISSÉ", margin + boxWidth / 2, currentY + 6, { align: "center" });
  doc.setFontSize(11);
  doc.text(formatMontant(data.totals.total_loyers), margin + boxWidth / 2, currentY + 14, { align: "center" });

  doc.setFillColor(231, 76, 60);
  doc.roundedRect(margin + boxWidth + 4, currentY, boxWidth, 18, 2, 2, "F");
  doc.setFontSize(8);
  doc.text("TOTAL DÉPENSES", margin + boxWidth + 4 + boxWidth / 2, currentY + 6, { align: "center" });
  doc.setFontSize(11);
  doc.text(formatMontant(data.totals.total_depenses + data.totals.commission), margin + boxWidth + 4 + boxWidth / 2, currentY + 14, { align: "center" });

  doc.setFillColor(41, 128, 185);
  doc.roundedRect(margin + 2 * (boxWidth + 4), currentY, boxWidth, 18, 2, 2, "F");
  doc.setFontSize(8);
  doc.text("À VERSER", margin + 2 * (boxWidth + 4) + boxWidth / 2, currentY + 6, { align: "center" });
  doc.setFontSize(11);
  doc.text(formatMontant(data.totals.somme_a_verser), margin + 2 * (boxWidth + 4) + boxWidth / 2, currentY + 14, { align: "center" });

  // FOOTER
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  doc.text(`Rapport généré le ${new Date().toLocaleDateString("fr-FR")} - PANPAS IMMOBILIER`, pageWidth / 2, pageHeight - 8, { align: "center" });

  const fileName = `Rapport_${data.proprietaire.nom.replace(/\s+/g, "_")}_${selectedMonth}.pdf`;
  doc.save(fileName);
  
  return {
    proprietaire_id: data.proprietaire.id,
    proprietaire_nom: data.proprietaire.nom,
    mois_concerne: selectedMonth,
    total_revenus: data.totals.total_loyers,
    total_depenses: data.totals.total_depenses + data.totals.commission,
    somme_a_verser: data.totals.somme_a_verser
  };
};

// ========== RAPPORT GENERAL AGENCE ==========
interface AgenceReportData {
  proprietaires: Array<{
    nom: string;
    total_loyers: number;
    total_depenses: number;
    commission: number;
    somme_versee: number;
  }>;
  totals: {
    total_loyers: number;
    total_depenses: number;
    total_commissions: number;
    benefice_net: number;
    nombre_biens: number;
    nombre_occupes: number;
    nombre_locataires: number;
  };
}

export const generateAgenceRapportPDF = async (
  data: AgenceReportData,
  selectedMonth: string,
  logoBase64?: string
) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let currentY = margin;

  const monthDate = new Date(selectedMonth + "-01");
  const monthLabel = monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // HEADER
  doc.setFillColor(52, 73, 94);
  doc.rect(0, 0, pageWidth, 40, "F");

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", margin, 10, 22, 22);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("PANPAS IMMOBILIER", logoBase64 ? margin + 28 : margin, 20);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("RAPPORT GÉNÉRAL DE L'AGENCE", logoBase64 ? margin + 28 : margin, 28);
  doc.text("+228 92 18 40 65", logoBase64 ? margin + 28 : margin, 35);

  currentY = 48;

  // TITRE
  doc.setFillColor(41, 128, 185);
  doc.rect(margin, currentY, contentWidth, 14, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`BILAN DU MOIS DE ${monthLabel.toUpperCase()}`, pageWidth / 2, currentY + 9, { align: "center" });

  currentY += 20;

  // STATISTIQUES GENERALES
  const statW = (contentWidth - 12) / 4;
  
  const stats = [
    { label: "Biens gérés", value: data.totals.nombre_biens, color: [41, 128, 185] },
    { label: "Occupés", value: data.totals.nombre_occupes, color: [46, 204, 113] },
    { label: "Libres", value: data.totals.nombre_biens - data.totals.nombre_occupes, color: [231, 76, 60] },
    { label: "Locataires", value: data.totals.nombre_locataires, color: [155, 89, 182] },
  ];

  stats.forEach((stat, i) => {
    const x = margin + i * (statW + 4);
    doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
    doc.roundedRect(x, currentY, statW, 20, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(stat.label, x + statW / 2, currentY + 7, { align: "center" });
    doc.setFontSize(14);
    doc.text(String(stat.value), x + statW / 2, currentY + 16, { align: "center" });
  });

  currentY += 28;

  // TABLEAU PAR PROPRIETAIRE
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(52, 73, 94);
  doc.text("RÉCAPITULATIF PAR PROPRIÉTAIRE", margin, currentY);
  currentY += 5;

  const propData = data.proprietaires.map(p => [
    p.nom,
    formatNumber(p.total_loyers),
    formatNumber(p.total_depenses),
    formatNumber(p.commission),
    formatNumber(p.somme_versee)
  ]);

  propData.push([
    "TOTAL",
    formatNumber(data.totals.total_loyers),
    formatNumber(data.totals.total_depenses),
    formatNumber(data.totals.total_commissions),
    formatNumber(data.totals.total_loyers - data.totals.total_depenses - data.totals.total_commissions)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Propriétaire", "Loyers", "Dépenses", "Commission", "Versé"]],
    body: propData,
    theme: "grid",
    headStyles: {
      fillColor: [52, 73, 94],
      fontSize: 9,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 50 },
      1: { halign: "right", cellWidth: 30 },
      2: { halign: "right", cellWidth: 30 },
      3: { halign: "right", cellWidth: 30 },
      4: { halign: "right", cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    didParseCell: function (hookData) {
      if (hookData.row.index === propData.length - 1) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [220, 220, 220];
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // RESUME FINANCIER AGENCE
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(52, 73, 94);
  doc.text("BILAN FINANCIER DE L'AGENCE", margin, currentY);
  currentY += 6;

  const financeBox = contentWidth / 2 - 5;

  // Commission gagnée
  doc.setFillColor(46, 204, 113);
  doc.roundedRect(margin, currentY, financeBox, 25, 3, 3, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("COMMISSIONS GAGNÉES", margin + financeBox / 2, currentY + 8, { align: "center" });
  doc.setFontSize(16);
  doc.text(formatMontant(data.totals.total_commissions), margin + financeBox / 2, currentY + 19, { align: "center" });

  // Bénéfice net
  doc.setFillColor(41, 128, 185);
  doc.roundedRect(margin + financeBox + 10, currentY, financeBox, 25, 3, 3, "F");
  doc.setFontSize(10);
  doc.text("BÉNÉFICE NET GLOBAL", margin + financeBox + 10 + financeBox / 2, currentY + 8, { align: "center" });
  doc.setFontSize(16);
  doc.text(formatMontant(data.totals.benefice_net), margin + financeBox + 10 + financeBox / 2, currentY + 19, { align: "center" });

  // FOOTER
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  doc.text(`Rapport interne généré le ${new Date().toLocaleDateString("fr-FR")} - CONFIDENTIEL - PANPAS IMMOBILIER`, pageWidth / 2, pageHeight - 8, { align: "center" });

  const fileName = `Rapport_Agence_${selectedMonth}.pdf`;
  doc.save(fileName);

  return {
    mois_concerne: selectedMonth,
    total_revenus: data.totals.total_loyers,
    total_depenses: data.totals.total_depenses,
    total_commissions: data.totals.total_commissions,
    benefice_net: data.totals.benefice_net
  };
};

// ========== CONTRAT PDF ==========
export const generateContratPDF = async (contrat: any, logoBase64?: string) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  const maxY = pageHeight - 25;
  let currentY = margin;

  const proprietaireNom = contrat.biens?.proprietaires?.nom || "Non renseigne";

  const checkNewPage = (neededSpace: number = 15) => {
    if (currentY + neededSpace > maxY) {
      addPageFooter();
      doc.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  const addPageFooter = () => {
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`Document genere le ${new Date().toLocaleDateString("fr-FR")} par PANPAS IMMOBILIER`, pageWidth / 2, pageHeight - 8, { align: "center" });
    doc.setTextColor(0, 0, 0);
  };

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", margin, currentY, 18, 18);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("AGENCE IMMOBILIERE PANPAS", logoBase64 ? margin + 22 : margin, currentY + 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Tel: +228 92 18 40 65", logoBase64 ? margin + 22 : margin, currentY + 10);
  doc.text("www.panpasimmobilier.tech", logoBase64 ? margin + 22 : margin, currentY + 14);

  currentY += 22;

  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  const titleType = contrat.biens?.type === "boutique" || contrat.biens?.type === "magasin"
    ? "CONTRAT DE BAIL A USAGE COMMERCIAL"
    : "CONTRAT DE BAIL A USAGE D'HABITATION";
  doc.text(titleType, pageWidth / 2, currentY, { align: "center" });

  currentY += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("ENTRE LES SOUSSIGNES", margin, currentY);
  doc.setTextColor(0, 0, 0);
  currentY += 6;

  doc.setFillColor(245, 248, 250);
  doc.rect(margin, currentY - 2, contentWidth, 12, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("LE BAILLEUR:", margin + 2, currentY + 3);
  doc.setFont("helvetica", "normal");
  doc.text(`Mr/Mme ${proprietaireNom}`, margin + 28, currentY + 3);
  currentY += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Represente par:", margin + 2, currentY + 3);
  doc.setFont("helvetica", "normal");
  doc.text("L'AGENCE IMMOBILIERE PANPAS - Tel: 92 18 40 65", margin + 32, currentY + 3);
  currentY += 9;

  doc.setFillColor(250, 245, 240);
  doc.rect(margin, currentY - 2, contentWidth, 16, "F");

  doc.setFont("helvetica", "bold");
  doc.text("LE PRENEUR:", margin + 2, currentY + 3);
  doc.setFont("helvetica", "normal");
  const preneurInfo = `${contrat.locataires?.nom || ""}${contrat.locataires?.telephone ? " - Tel: " + contrat.locataires.telephone : ""}`;
  doc.text(preneurInfo, margin + 28, currentY + 3);
  currentY += 5;

  if (contrat.locataires?.piece_identite) {
    doc.setFont("helvetica", "bold");
    doc.text("Piece d'identite:", margin + 2, currentY + 3);
    doc.setFont("helvetica", "normal");
    doc.text(contrat.locataires.piece_identite, margin + 35, currentY + 3);
    currentY += 5;
  }

  if (contrat.locataires?.adresse) {
    doc.setFont("helvetica", "bold");
    doc.text("Adresse:", margin + 2, currentY + 3);
    doc.setFont("helvetica", "normal");
    doc.text(contrat.locataires.adresse, margin + 20, currentY + 3);
  }
  currentY += 10;

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text("Conformement aux dispositions du Code Civil Togolais relatives au louage de choses", margin, currentY);
  doc.setTextColor(0, 0, 0);
  currentY += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("IL A ETE CONVENU CE QUI SUIT:", margin, currentY);
  currentY += 6;

  const articles = [
    {
      title: "ARTICLE 1 - DESIGNATION DU BIEN",
      content: `Le Bailleur donne a bail au Preneur qui accepte, le bien immobilier suivant:\n- Designation: ${contrat.biens?.nom || "Non renseigne"}\n- Type: ${contrat.biens?.type || "Non renseigne"}\n- Adresse: ${contrat.biens?.adresse || "Non renseignee"}`
    },
    {
      title: "ARTICLE 2 - OBJET DU BAIL",
      content: `Le present bail est consenti et accepte pour l'usage exclusif d'${contrat.biens?.type === "boutique" || contrat.biens?.type === "magasin" ? "activite commerciale" : "habitation personnelle"} du Preneur.`
    },
    {
      title: "ARTICLE 3 - DUREE DU BAIL",
      content: `Le present bail est consenti pour une duree indeterminee a compter du ${new Date(contrat.date_debut).toLocaleDateString("fr-FR")}${contrat.date_fin ? ` jusqu'au ${new Date(contrat.date_fin).toLocaleDateString("fr-FR")}` : ""}.`
    },
    {
      title: "ARTICLE 4 - CONDITIONS FINANCIERES",
      content: `Le present bail est consenti moyennant:\n- Loyer mensuel: ${formatMontant(contrat.loyer_mensuel)}\n- Caution (depot de garantie): ${formatMontant(contrat.caution || 0)}\n- Avance sur loyer: ${contrat.avance_mois || 0} mois\n\nLe loyer est payable d'avance le 10 de chaque mois.`
    },
    {
      title: "ARTICLE 5 - OBLIGATIONS DU PRENEUR",
      content: "Le Preneur s'engage a:\n- Payer regulierement le loyer aux echeances convenues\n- Entretenir le bien en bon pere de famille\n- Ne pas sous-louer sans accord ecrit du Bailleur\n- Signaler immediatement tout dommage au bien\n- Respecter le reglement interieur et le voisinage"
    },
    {
      title: "ARTICLE 6 - OBLIGATIONS DU BAILLEUR",
      content: "Le Bailleur s'engage a:\n- Delivrer le bien en bon etat\n- Assurer la jouissance paisible du bien\n- Effectuer les grosses reparations\n- Restituer la caution en fin de bail, deduction faite des eventuels degats"
    },
    {
      title: "ARTICLE 7 - RESILIATION",
      content: "Le bail peut etre resilie:\n- Par le Preneur avec un preavis de 1 mois\n- Par le Bailleur avec un preavis de 3 mois\n- De plein droit en cas de non-paiement de 2 mois de loyer consecutifs"
    },
    {
      title: "ARTICLE 8 - CLAUSE PENALE",
      content: "Tout retard de paiement du loyer au-dela de 10 jours entrainera une penalite de 10% du montant du."
    },
    {
      title: "ARTICLE 9 - ELECTION DE DOMICILE",
      content: "Pour l'execution des presentes, les parties elisent domicile:\n- Le Bailleur: a l'Agence PANPAS IMMOBILIER\n- Le Preneur: au lieu loue"
    }
  ];

  for (const article of articles) {
    checkNewPage(25);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text(article.title, margin, currentY);
    doc.setTextColor(0, 0, 0);
    currentY += 4;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(article.content, contentWidth);
    for (const line of lines) {
      checkNewPage(5);
      doc.text(line, margin, currentY);
      currentY += 4;
    }
    currentY += 3;
  }

  checkNewPage(50);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("FIN DU BAIL - SIGNATURES", pageWidth / 2, currentY, { align: "center" });
  doc.setTextColor(0, 0, 0);
  currentY += 8;

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(`Fait en double exemplaire a Lome, le ${new Date().toLocaleDateString("fr-FR")}`, pageWidth / 2, currentY, { align: "center" });
  currentY += 8;

  const sigWidth = (contentWidth - 10) / 3;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("LE BAILLEUR", margin + sigWidth / 2, currentY, { align: "center" });
  doc.text("L'AGENCE", pageWidth / 2, currentY, { align: "center" });
  doc.text("LE PRENEUR", pageWidth - margin - sigWidth / 2, currentY, { align: "center" });
  currentY += 3;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("(Signature)", margin + sigWidth / 2, currentY, { align: "center" });
  doc.text("(Cachet + Signature)", pageWidth / 2, currentY, { align: "center" });
  doc.text("(Signature)", pageWidth - margin - sigWidth / 2, currentY, { align: "center" });

  currentY += 5;
  doc.setDrawColor(150, 150, 150);
  doc.rect(margin, currentY, sigWidth, 25);
  doc.rect(margin + sigWidth + 5, currentY, sigWidth, 25);
  doc.rect(pageWidth - margin - sigWidth, currentY, sigWidth, 25);

  addPageFooter();

  const fileName = `Contrat_${contrat.locataires?.nom?.replace(/\s+/g, "_") || "locataire"}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};

// ========== RAPPORT FINANCIER SIMPLE (existant) ==========
export const generateRapportPDF = async (financialData: any, selectedMonth: string, logoBase64?: string) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let currentY = margin;

  const monthDate = new Date(selectedMonth + "-01");
  const monthLabel = monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", margin, currentY, 18, 18);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("PANPAS IMMOBILIER", logoBase64 ? margin + 22 : margin, currentY + 6);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Rapport Financier Mensuel", logoBase64 ? margin + 22 : margin, currentY + 11);
  doc.text("+228 92 18 40 65 | www.panpasimmobilier.tech", logoBase64 ? margin + 22 : margin, currentY + 15);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`Mois: ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`, pageWidth - margin, currentY + 8, { align: "right" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Genere le ${new Date().toLocaleDateString("fr-FR")}`, pageWidth - margin, currentY + 13, { align: "right" });

  currentY += 22;

  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("RAPPORT FINANCIER", pageWidth / 2, currentY, { align: "center" });
  currentY += 10;

  const cardWidth = (contentWidth - 10) / 3;

  doc.setFillColor(220, 252, 231);
  doc.roundedRect(margin, currentY, cardWidth, 22, 3, 3, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(34, 197, 94);
  doc.text("REVENUS TOTAUX", margin + cardWidth / 2, currentY + 6, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(formatMontant(financialData.totals.revenus), margin + cardWidth / 2, currentY + 15, { align: "center" });

  doc.setFillColor(254, 226, 226);
  doc.roundedRect(margin + cardWidth + 5, currentY, cardWidth, 22, 3, 3, "F");
  doc.setTextColor(239, 68, 68);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("DEPENSES TOTALES", margin + cardWidth + 5 + cardWidth / 2, currentY + 6, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(formatMontant(financialData.totals.depenses), margin + cardWidth + 5 + cardWidth / 2, currentY + 15, { align: "center" });

  const beneficeColor = financialData.totals.benefice >= 0 ? [59, 130, 246] : [239, 68, 68];
  doc.setFillColor(beneficeColor[0] >= 100 ? 219 : 254, beneficeColor[0] >= 100 ? 234 : 226, beneficeColor[0] >= 100 ? 254 : 226);
  doc.roundedRect(pageWidth - margin - cardWidth, currentY, cardWidth, 22, 3, 3, "F");
  doc.setTextColor(beneficeColor[0], beneficeColor[1], beneficeColor[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("BENEFICE NET", pageWidth - margin - cardWidth / 2, currentY + 6, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(formatMontant(financialData.totals.benefice), pageWidth - margin - cardWidth / 2, currentY + 15, { align: "center" });

  currentY += 30;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("DETAIL PAR PROPRIETAIRE", margin, currentY);
  currentY += 6;

  const tableData = financialData.byProprietaire.map((prop: any) => [
    prop.nom,
    formatMontant(prop.revenus),
    formatMontant(prop.depenses),
    formatMontant(prop.benefice)
  ]);

  tableData.push([
    "TOTAL",
    formatMontant(financialData.totals.revenus),
    formatMontant(financialData.totals.depenses),
    formatMontant(financialData.totals.benefice)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Proprietaire", "Revenus", "Depenses", "Benefice"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [52, 73, 94],
      fontSize: 9,
      fontStyle: "bold",
      halign: "center"
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    didParseCell: function (hookData) {
      if (hookData.row.index === tableData.length - 1) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [240, 240, 240];
      }
    }
  });

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "italic");
  doc.text("Rapport genere automatiquement par PANPAS IMMOBILIER", pageWidth / 2, pageHeight - 10, { align: "center" });

  const fileName = `Rapport_Financier_${selectedMonth}.pdf`;
  doc.save(fileName);
  
  return {
    mois_concerne: selectedMonth,
    total_revenus: financialData.totals.revenus,
    total_depenses: financialData.totals.depenses,
    benefice_net: financialData.totals.benefice,
    donnees_json: financialData
  };
};
