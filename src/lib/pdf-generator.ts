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
  margin?: number; // mm
  customSize?: [number, number]; // [width, height] in mm for custom
};

export const generateReceiptPDF = async (
  paiement: PaiementData,
  logoBase64?: string,
  options?: PrintOptions,
) => {
  // Default to A5 portrait
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

  // Police Helvetica uniquement, max 10pt
  doc.setFont("helvetica", "normal");

  // === CALCUL DES MOIS ===
  let nombreMois = paiement.nombreMois || 1;
  const loyerMensuel = paiement.contrat?.loyer_mensuel || paiement.montant;

  if (!paiement.nombreMois && paiement.contrat?.loyer_mensuel > 0 && paiement.montant > 0) {
    nombreMois = Math.max(1, Math.round(paiement.montant / paiement.contrat.loyer_mensuel));
  }

  // === BLOC 1: HEADER (Logo + Entreprise) ===
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

  // Numéro facture à droite
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

  // Ligne séparatrice
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  // === BLOC 2: INFORMATIONS (Locataire + Bien) ===
  const colWidth = (contentWidth - 4) / 2;

  // Locataire
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

  // Bien LOUÉ (avec accent)
  const col2X = margin + colWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.rect(col2X, currentY, colWidth, 18, "F");
  doc.setDrawColor(220, 220, 220);
  doc.rect(col2X, currentY, colWidth, 18);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("BIEN LOUÉ", col2X + 2, currentY + 4); // Corrigé avec accent
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(truncateText(paiement.bien.nom, 28), col2X + 2, currentY + 8);
  doc.setFontSize(6);
  doc.text(truncateText(paiement.bien.adresse, 30), col2X + 2, currentY + 12);
  doc.text(`Type: ${paiement.bien.type}`, col2X + 2, currentY + 16);

  currentY += 21;

  // === BLOC 3: TYPE PAIEMENT ===
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

  // === BLOC 4: TABLEAU DES PAIEMENTS ===
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

  // Police adaptative selon nombre de lignes
  const fontSize = tableData.length > 8 ? 6 : 7;

  // Calculate column widths proportionally to contentWidth to adapt to different formats
  const col0Width = Math.max(10, Math.round(contentWidth * 0.09));
  const col2Width = Math.max(24, Math.round(contentWidth * 0.28));
  const col1Width = contentWidth - col0Width - col2Width - 2; // small gap

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

  // === BLOC 5: TOTAL ===
  doc.setFillColor(46, 204, 113);
  doc.rect(margin, currentY, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL PAYE:", margin + 3, currentY + 5);
  doc.text(formatMontant(paiement.montant), pageWidth - margin - 3, currentY + 5, { align: "right" });
  doc.setTextColor(0, 0, 0);

  currentY += 10;

  // === BLOC 6: PÉRIODE + PROCHAIN PAIEMENT ===
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

  // Prochain paiement - AVANT LE ajouté
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
    // Ajout de "AVANT LE" avant la date
    const nextPaymentText = `AVANT LE 10 ${nextMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
    doc.text(nextPaymentText, pageWidth - margin - 2, currentY + 4, { align: "right" });
    doc.setTextColor(0, 0, 0);

    currentY += 8;
  }

  // === SUPPRESSION DU BLOC NOTE ET AJUSTEMENT DU PIED DE PAGE ===
  // On supprime complètement le bloc note et on ajuste le pied de page
  
  // Calcul de la position optimale pour le pied de page
  const footerY = Math.max(currentY + 8, pageHeight - 8);
  
  // Pied de page positionné intelligemment
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  
  // S'il y a assez d'espace, mettre le pied de page près du bas
  if (footerY < pageHeight - 10) {
    doc.text("Ce document fait foi de paiement. Merci. - PANPAS IMMOBILIER", 
             pageWidth / 2, pageHeight - 5, { align: "center" });
  } else {
    // Sinon, le mettre juste après le dernier contenu
    doc.text("Ce document fait foi de paiement. Merci. - PANPAS IMMOBILIER", 
             pageWidth / 2, currentY + 5, { align: "center" });
  }

  // === SAUVEGARDE ===
  const fileName = `Facture_${paiement.locataire.nom.replace(/\s+/g, "_")}_${new Date(paiement.date_paiement).toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};

// Generate Professional Contract PDF
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

  // Logo
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

  // Articles
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

  // Signatures
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

// Generate Financial Report PDF
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

  // Header
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

  // Date
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

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("RAPPORT FINANCIER", pageWidth / 2, currentY, { align: "center" });
  currentY += 10;

  // Summary cards
  const cardWidth = (contentWidth - 10) / 3;

  // Revenus
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(margin, currentY, cardWidth, 22, 3, 3, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(34, 197, 94);
  doc.text("REVENUS TOTAUX", margin + cardWidth / 2, currentY + 6, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(formatMontant(financialData.totals.revenus), margin + cardWidth / 2, currentY + 15, { align: "center" });

  // Dépenses
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(margin + cardWidth + 5, currentY, cardWidth, 22, 3, 3, "F");
  doc.setTextColor(239, 68, 68);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("DEPENSES TOTALES", margin + cardWidth + 5 + cardWidth / 2, currentY + 6, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(formatMontant(financialData.totals.depenses), margin + cardWidth + 5 + cardWidth / 2, currentY + 15, { align: "center" });

  // Bénéfice
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

  // Table
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
    didParseCell: function (data) {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    }
  });

  // Footer
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