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
  nombreMois?: number; // Nombre de mois pour avance
}

// Format number with separators and FCFA - simple format for PDF
const formatMontant = (montant: number): string => {
  const parts = montant.toString().split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return intPart + " FCFA";
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

export const generateReceiptPDF = async (paiement: PaiementData, logoBase64?: string) => {
  // Format demi-page A4 (A6) pour imprimer 2 recus par page
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [148, 105],
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 6;

  let currentY = margin;
  
  // Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", margin, currentY, 12, 12);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }

  // Company Header
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PANPAS IMMOBILIER", logoBase64 ? margin + 14 : margin, currentY + 4);

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Gestion Immobiliere Professionnelle", logoBase64 ? margin + 14 : margin, currentY + 8);
  doc.text("Tel: +228 92 18 40 65", logoBase64 ? margin + 14 : margin, currentY + 11);

  // Receipt Title
  currentY += 16;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("RECU DE PAIEMENT", pageWidth / 2, currentY, { align: "center" });
  doc.setTextColor(0, 0, 0);

  // Receipt Number and Date on same line
  currentY += 5;
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  const receiptNumber = generateReceiptNumber(paiement.id, paiement.date_paiement);
  doc.text(`N: ${receiptNumber}`, margin, currentY);
  doc.text(`Date: ${new Date(paiement.date_paiement).toLocaleDateString("fr-FR")}`, pageWidth - margin, currentY, { align: "right" });

  // Separator
  currentY += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 3;

  // Tenant and Property Info - Compact
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("Locataire:", margin, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(paiement.locataire.nom, margin + 18, currentY);
  doc.text(`Tel: ${paiement.locataire.telephone}`, pageWidth / 2 + 5, currentY);
  
  currentY += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Bien:", margin, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(`${paiement.bien.nom} - ${paiement.bien.adresse}`, margin + 18, currentY);

  currentY += 5;

  // Payment Type Label
  const typeLabels: { [key: string]: string } = {
    loyer: "LOYER",
    avance: "AVANCE SUR LOYER",
    caution: "DEPOT DE GARANTIE (CAUTION)"
  };
  
  // Determine number of months for avance
  let nombreMois = 1;
  if (paiement.type === "avance" && paiement.contrat?.loyer_mensuel > 0) {
    nombreMois = Math.round(paiement.montant / paiement.contrat.loyer_mensuel);
  }

  // Payment Details Table
  const tableData: string[][] = [];
  
  if (paiement.type === "loyer") {
    const moisLabel = paiement.mois_concerne 
      ? new Date(paiement.mois_concerne).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
      : "-";
    tableData.push(["Type de paiement", "LOYER MENSUEL"]);
    tableData.push(["Mois concerne", moisLabel]);
    tableData.push(["Loyer mensuel", formatMontant(paiement.contrat.loyer_mensuel)]);
    tableData.push(["Montant paye", formatMontant(paiement.montant)]);
  } else if (paiement.type === "avance") {
    tableData.push(["Type de paiement", "AVANCE SUR LOYER"]);
    tableData.push(["Nombre de mois", `${nombreMois} mois`]);
    tableData.push(["Loyer mensuel", formatMontant(paiement.contrat.loyer_mensuel)]);
    tableData.push(["Montant total avance", formatMontant(paiement.montant)]);
  } else if (paiement.type === "caution") {
    tableData.push(["Type de paiement", "DEPOT DE GARANTIE"]);
    tableData.push(["Description", "Caution remboursable"]);
    tableData.push(["Montant caution", formatMontant(paiement.montant)]);
  }

  autoTable(doc, {
    startY: currentY,
    body: tableData,
    theme: "plain",
    styles: {
      fontSize: 6,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      1: { cellWidth: 85, halign: 'left' },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // Total Box
  doc.setFillColor(41, 128, 185);
  doc.rect(margin, currentY, pageWidth - 2 * margin, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL PAYE:", margin + 3, currentY + 4.5);
  doc.text(formatMontant(paiement.montant), pageWidth - margin - 3, currentY + 4.5, { align: "right" });
  doc.setTextColor(0, 0, 0);

  currentY += 10;

  // Next payment due (for rent and avance only)
  if (paiement.type === "loyer" && paiement.mois_concerne) {
    const nextMonth = new Date(paiement.mois_concerne);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(10);

    doc.setFillColor(240, 248, 255);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 7, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text("Prochain paiement:", margin + 2, currentY + 3);
    doc.setFont("helvetica", "normal");
    doc.text(`Le 10 ${nextMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`, margin + 2, currentY + 6);
    currentY += 9;
  } else if (paiement.type === "avance" && paiement.mois_concerne) {
    const finAvance = new Date(paiement.mois_concerne);
    finAvance.setMonth(finAvance.getMonth() + nombreMois);
    finAvance.setDate(10);

    doc.setFillColor(240, 248, 255);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 7, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text("Prochain paiement apres avance:", margin + 2, currentY + 3);
    doc.setFont("helvetica", "normal");
    doc.text(`Le 10 ${finAvance.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`, margin + 2, currentY + 6);
    currentY += 9;
  }

  // Note for caution
  if (paiement.type === "caution") {
    doc.setFillColor(255, 250, 240);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 6, "F");
    doc.setFontSize(5);
    doc.setFont("helvetica", "italic");
    doc.text("Note: La caution sera restituee en fin de bail, deduction faite des eventuels dommages.", margin + 2, currentY + 4);
    currentY += 8;
  }

  // Footer
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(5);
  doc.setFont("helvetica", "italic");
  doc.text("Ce recu fait foi de paiement. PANPAS IMMOBILIER - www.panpasimmobilier.tech", pageWidth / 2, pageHeight - 4, { align: "center" });

  // Save
  doc.save(`Recu_${paiement.locataire.nom.replace(/\s+/g, "_")}_${new Date(paiement.date_paiement).toISOString().split("T")[0]}.pdf`);
};

// Generate Professional Contract PDF - Format PANPAS
export const generateContratPDF = async (contrat: any, logoBase64?: string) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let currentY = margin;

  // Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", margin, currentY, 20, 20);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }

  // Company Header
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("AGENCE IMMOBILIERE PANPAS", logoBase64 ? margin + 25 : margin, currentY + 6);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("Tel: +228 92 18 40 65", logoBase64 ? margin + 25 : margin, currentY + 11);
  doc.text("www.panpasimmobilier.tech", logoBase64 ? margin + 25 : margin, currentY + 15);

  currentY += 30;

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("CONTRAT DE BAIL A USAGE D'HABITATION", pageWidth / 2, currentY, { align: "center" });
  
  currentY += 12;

  // ENTRE LES SOUSSIGNES
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ENTRE LES SOUSSIGNES", margin, currentY);
  currentY += 8;

  // Bailleur
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Bailleur:", margin, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(`Mr/Mme ${contrat.biens?.proprietaires?.nom || "Proprietaire"}`, margin + 25, currentY);
  currentY += 5;
  
  doc.setFont("helvetica", "bold");
  doc.text("Represente par:", margin, currentY);
  doc.setFont("helvetica", "normal");
  doc.text("L'AGENCE IMMOBILIERE PANPAS - Tel: 92 18 40 65", margin + 30, currentY);
  currentY += 8;

  // Preneur
  doc.setFont("helvetica", "bold");
  doc.text("Preneur:", margin, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(`${contrat.locataires?.nom}`, margin + 25, currentY);
  if (contrat.locataires?.telephone) {
    doc.text(`Tel: ${contrat.locataires?.telephone}`, margin + 100, currentY);
  }
  currentY += 5;

  if (contrat.locataires?.piece_identite) {
    doc.setFont("helvetica", "bold");
    doc.text("CI du preneur:", margin, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(contrat.locataires.piece_identite, margin + 30, currentY);
    currentY += 5;
  }

  if (contrat.locataires?.adresse) {
    doc.setFont("helvetica", "bold");
    doc.text("Adresse:", margin, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(contrat.locataires.adresse, margin + 25, currentY);
    currentY += 5;
  }

  currentY += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("Loi applicable: Dispositions du Code civil applicables au Togo et autres textes en vigueur.", margin, currentY);
  currentY += 10;

  // ARTICLES
  const typeLabels: { [key: string]: string } = {
    maison: "Maison",
    boutique: "Boutique",
    chambre: "Chambre",
    magasin: "Magasin",
  };
  const typeBien = typeLabels[contrat.biens?.type] || contrat.biens?.type;

  // Article 1
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 1: Designation", margin, currentY);
  currentY += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${typeBien} - ${contrat.biens?.nom}`, margin + 5, currentY);
  doc.text(`Adresse: ${contrat.biens?.adresse}`, margin + 5, currentY + 5);
  currentY += 12;

  // Article 2
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 2: Objet", margin, currentY);
  currentY += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const usage = contrat.biens?.type === "boutique" || contrat.biens?.type === "magasin" ? "Usage commercial" : "Usage d'habitation";
  doc.text(usage, margin + 5, currentY);
  currentY += 10;

  // Article 3
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 3: Etat des lieux", margin, currentY);
  currentY += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("a- Etat des locaux: interieur en bon etat de fonctionnement.", margin + 5, currentY);
  currentY += 5;
  doc.text("b- Nombre de cles remises: selon inventaire.", margin + 5, currentY);
  currentY += 5;
  doc.text("c- Equipements existants: selon etat des lieux d'entree.", margin + 5, currentY);
  currentY += 10;

  // Article 4
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 4: Duree et prise d'effet", margin, currentY);
  currentY += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const duree = contrat.date_fin ? `Du ${new Date(contrat.date_debut).toLocaleDateString("fr-FR")} au ${new Date(contrat.date_fin).toLocaleDateString("fr-FR")}` : "Duree indeterminee";
  doc.text(`a- Duree: ${duree}`, margin + 5, currentY);
  currentY += 5;
  doc.text(`b- Prise d'effet: ${new Date(contrat.date_debut).toLocaleDateString("fr-FR")}`, margin + 5, currentY);
  currentY += 10;

  // Article 5 - Conditions financieres
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 5: Conditions financieres", margin, currentY);
  currentY += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`a- Loyer mensuel: ${formatMontant(contrat.loyer_mensuel)}`, margin + 5, currentY);
  currentY += 5;
  doc.text(`b- Depot de garantie (Caution): ${formatMontant(contrat.caution)}`, margin + 5, currentY);
  currentY += 5;
  if (contrat.avance_mois > 0) {
    doc.text(`c- Avance versee: ${contrat.avance_mois} mois de loyer (${formatMontant(contrat.avance_mois * contrat.loyer_mensuel)})`, margin + 5, currentY);
    currentY += 5;
  }
  doc.text(`d- Paiement du loyer: Le 10 de chaque mois.`, margin + 5, currentY);
  currentY += 10;

  // Article 6
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 6: Obligations du preneur", margin, currentY);
  currentY += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const obligations = [
    "- Entretenir et maintenir les locaux en bon etat",
    "- Payer le loyer a la date convenue",
    "- Informer le bailleur de toute reparation necessaire",
    "- Ne pas sous-louer sans accord ecrit du bailleur"
  ];
  obligations.forEach((o) => {
    doc.text(o, margin + 5, currentY);
    currentY += 4.5;
  });
  currentY += 5;

  // Article 7
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 7: Resiliation et preavis", margin, currentY);
  currentY += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("La resiliation de ce bail par une partie est obligatoirement precedee d'un preavis de 3 mois.", margin + 5, currentY);
  currentY += 5;
  doc.text("A defaut, le concerne s'engage a payer une indemnite d'un (01) mois de loyer.", margin + 5, currentY);
  currentY += 10;

  // Article 8
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 8: Fin du bail", margin, currentY);
  currentY += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("A la fin du bail, le preneur s'engage a:", margin + 5, currentY);
  currentY += 5;
  doc.text("- Remettre les locaux dans l'etat initial", margin + 5, currentY);
  currentY += 4.5;
  doc.text("- Restituer toutes les cles", margin + 5, currentY);
  currentY += 4.5;
  doc.text("- La caution sera restituee apres verification de l'etat des lieux", margin + 5, currentY);
  currentY += 15;

  // Date and Signatures
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fait a Kara, le ${new Date(contrat.date_debut).toLocaleDateString("fr-FR")}`, margin, currentY);
  currentY += 10;

  // Signatures section
  doc.setFont("helvetica", "bold");
  doc.text("LE PRENEUR", margin + 15, currentY);
  doc.text("BAILLEUR", pageWidth - margin - 40, currentY);
  
  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.text(contrat.locataires?.nom || "", margin + 5, currentY);
  doc.text("AGENCE IMMOBILIERE PANPAS", pageWidth - margin - 55, currentY);
  
  // Signature lines
  doc.line(margin, currentY + 15, margin + 60, currentY + 15);
  doc.line(pageWidth - margin - 60, currentY + 15, pageWidth - margin, currentY + 15);

  // FIN DU BAIL section at bottom
  currentY = pageHeight - 45;
  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, currentY, pageWidth - 2 * margin, 35);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("FIN DU BAIL", pageWidth / 2, currentY + 5, { align: "center" });
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Liquidation:", margin + 5, currentY + 12);
  doc.text("Montant restant apres liquidation:", pageWidth / 2 + 5, currentY + 12);
  doc.text("Date de reprise des cles:", margin + 5, currentY + 20);
  doc.text("Reserves:", pageWidth / 2 + 5, currentY + 20);
  
  doc.text("LOCATAIRE", margin + 20, currentY + 28);
  doc.text("Signature", pageWidth / 2 - 5, currentY + 28);
  doc.text("BAILLEUR", pageWidth - margin - 30, currentY + 28);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`Document genere le ${new Date().toLocaleDateString("fr-FR")} par PANPAS IMMOBILIER`, pageWidth / 2, pageHeight - 5, { align: "center" });

  // Save
  doc.save(`Contrat_${contrat.locataires?.nom.replace(/\s+/g, "_")}_${contrat.biens?.nom.replace(/\s+/g, "_")}.pdf`);
};

// Generate Financial Report PDF
export const generateRapportPDF = async (
  financialData: any,
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
  const margin = 20;
  let currentY = margin;

  // Logo et En-tete
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", margin, currentY, 25, 25);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }

  // Company Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("PANPAS IMMOBILIER", logoBase64 ? margin + 30 : margin, currentY + 8);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("Gestion Immobiliere Professionnelle", logoBase64 ? margin + 30 : margin, currentY + 14);
  doc.text("Tel: +228 92 18 40 65 | www.panpasimmobilier.tech", logoBase64 ? margin + 30 : margin, currentY + 19);

  currentY += 35;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("RAPPORT FINANCIER MENSUEL", pageWidth / 2, currentY, { align: "center" });

  currentY += 8;
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  const [year, month] = selectedMonth.split("-");
  const monthNames = [
    "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"
  ];
  doc.text(`${monthNames[parseInt(month) - 1]} ${year}`, pageWidth / 2, currentY, { align: "center" });

  currentY += 15;
  doc.setTextColor(0, 0, 0);

  // Summary Cards
  doc.setFillColor(46, 204, 113);
  doc.rect(margin, currentY, 50, 25, "F");
  doc.setFillColor(231, 76, 60);
  doc.rect(margin + 55, currentY, 50, 25, "F");
  doc.setFillColor(52, 152, 219);
  doc.rect(margin + 110, currentY, 50, 25, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text("REVENUS", margin + 25, currentY + 6, { align: "center" });
  doc.text("DEPENSES", margin + 80, currentY + 6, { align: "center" });
  doc.text("BENEFICE NET", margin + 135, currentY + 6, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(formatMontant(financialData.totalRevenus), margin + 25, currentY + 16, { align: "center" });
  doc.text(formatMontant(financialData.totalDepenses), margin + 80, currentY + 16, { align: "center" });
  doc.text(formatMontant(financialData.beneficeNet), margin + 135, currentY + 16, { align: "center" });

  currentY += 35;
  doc.setTextColor(0, 0, 0);

  // Commission PANPAS
  doc.setFillColor(155, 89, 182);
  doc.rect(margin, currentY, pageWidth - 2 * margin, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("COMMISSION PANPAS:", margin + 5, currentY + 8);
  doc.text(formatMontant(financialData.commissionPanpas), pageWidth - margin - 5, currentY + 8, { align: "right" });

  currentY += 20;
  doc.setTextColor(0, 0, 0);

  // Details by Owner
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DETAIL PAR PROPRIETAIRE", margin, currentY);
  currentY += 8;

  if (financialData.detailsParProprietaire && financialData.detailsParProprietaire.length > 0) {
    financialData.detailsParProprietaire.forEach((prop: any) => {
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = margin;
      }

      doc.setFillColor(240, 240, 240);
      doc.rect(margin, currentY, pageWidth - 2 * margin, 8, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(prop.proprietaire, margin + 3, currentY + 5.5);
      currentY += 10;

      if (prop.biens && prop.biens.length > 0) {
        const tableData = prop.biens.map((bien: any) => [
          bien.nom,
          formatMontant(bien.revenus),
          formatMontant(bien.depenses),
          `${bien.commissionPourcentage}%`,
          formatMontant(bien.commission),
          formatMontant(bien.netProprietaire)
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [["Bien", "Revenus", "Depenses", "Comm.%", "Commission", "Net Proprio"]],
          body: tableData,
          theme: "striped",
          headStyles: {
            fillColor: [41, 128, 185],
            fontSize: 8,
            fontStyle: "bold",
          },
          bodyStyles: {
            fontSize: 8,
          },
          margin: { left: margin, right: margin },
        });

        currentY = (doc as any).lastAutoTable.finalY + 5;

        // Subtotal for owner
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`Total ${prop.proprietaire}: Net a reverser: ${formatMontant(prop.totalNet)}`, margin + 3, currentY);
        currentY += 10;
      }
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Rapport genere le ${new Date().toLocaleDateString("fr-FR")} par PANPAS IMMOBILIER`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  // Save
  doc.save(`Rapport_Financier_${selectedMonth}.pdf`);
};
