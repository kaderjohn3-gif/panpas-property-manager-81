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
  moisDetails?: { mois: string; montant: number }[]; // Détails pour multi-mois
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
  // Format A5 exact: 148 × 210 mm
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [148, 210], // A5 dimensions exactes
  });

  const pageWidth = 148;
  const pageHeight = 210;
  const margin = 8;
  let currentY = margin;
  
  // === EN-TÊTE ===
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", margin, currentY, 15, 15);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("PANPAS IMMOBILIER", logoBase64 ? margin + 18 : margin, currentY + 5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Gestion Immobiliere Professionnelle", logoBase64 ? margin + 18 : margin, currentY + 9);
  doc.text("+228 92 18 40 65 | www.panpasimmobilier.tech", logoBase64 ? margin + 18 : margin, currentY + 13);

  currentY += 18;
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // === TITRE FACTURE ===
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("FACTURE / RECU DE PAIEMENT", pageWidth / 2, currentY, { align: "center" });
  doc.setTextColor(0, 0, 0);

  currentY += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const receiptNumber = generateReceiptNumber(paiement.id, paiement.date_paiement);
  doc.text(`N°: ${receiptNumber}`, margin, currentY);
  doc.text(`Date: ${new Date(paiement.date_paiement).toLocaleDateString("fr-FR")}`, pageWidth - margin, currentY, { align: "right" });

  currentY += 6;

  // === INFO CLIENT & BIEN (compact) ===
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, pageWidth - 2 * margin, 18, "F");
  doc.setDrawColor(220, 220, 220);
  doc.rect(margin, currentY, pageWidth - 2 * margin, 18);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("LOCATAIRE:", margin + 2, currentY + 4);
  doc.setFont("helvetica", "normal");
  doc.text(`${paiement.locataire.nom} | Tel: ${paiement.locataire.telephone}`, margin + 2, currentY + 8);
  
  doc.setFont("helvetica", "bold");
  doc.text("BIEN:", margin + 2, currentY + 13);
  doc.setFont("helvetica", "normal");
  doc.text(`${paiement.bien.nom} - ${paiement.bien.adresse}`, margin + 2, currentY + 17);

  currentY += 22;

  // === BANDEAU TYPE PAIEMENT ===
  const typeLabels: { [key: string]: string } = {
    loyer: "PAIEMENT DE LOYER",
    avance: "AVANCE SUR LOYER",
    caution: "DEPOT DE GARANTIE",
    arrieres: "ARRIERES DE LOYER"
  };
  
  doc.setFillColor(41, 128, 185);
  doc.rect(margin, currentY, pageWidth - 2 * margin, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(typeLabels[paiement.type] || "PAIEMENT", pageWidth / 2, currentY + 4.5, { align: "center" });
  doc.setTextColor(0, 0, 0);

  currentY += 9;

  // === CALCUL NOMBRE DE MOIS ===
  let nombreMois = paiement.nombreMois || 1;
  if (!paiement.nombreMois && paiement.contrat?.loyer_mensuel > 0 && paiement.montant > 0) {
    nombreMois = Math.max(1, Math.round(paiement.montant / paiement.contrat.loyer_mensuel));
  }

  // === TABLEAU DES PAIEMENTS (compact pour multi-mois) ===
  const tableData: string[][] = [];
  const loyerMensuel = paiement.contrat?.loyer_mensuel || paiement.montant;

  if (paiement.type === "loyer" || paiement.type === "avance" || paiement.type === "arrieres") {
    if (paiement.moisDetails && paiement.moisDetails.length > 0) {
      // Utiliser les détails fournis
      paiement.moisDetails.forEach((detail, index) => {
        const moisLabel = new Date(detail.mois).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
        tableData.push([
          `Mois ${index + 1}`,
          moisLabel.charAt(0).toUpperCase() + moisLabel.slice(1),
          formatMontant(detail.montant)
        ]);
      });
    } else if (paiement.mois_concerne && nombreMois >= 1) {
      // Générer les lignes pour chaque mois
      const startDate = new Date(paiement.mois_concerne);
      for (let i = 0; i < nombreMois; i++) {
        const moisDate = new Date(startDate);
        moisDate.setMonth(moisDate.getMonth() + i);
        const moisLabel = moisDate.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
        tableData.push([
          `Mois ${i + 1}`,
          moisLabel.charAt(0).toUpperCase() + moisLabel.slice(1),
          formatMontant(loyerMensuel)
        ]);
      }
    } else {
      // Paiement simple sans mois spécifié
      tableData.push([
        "Loyer",
        "-",
        formatMontant(paiement.montant)
      ]);
    }
  } else if (paiement.type === "caution") {
    tableData.push([
      "Caution",
      "Depot de garantie",
      formatMontant(paiement.montant)
    ]);
  }

  // Taille de police adaptée selon le nombre de lignes
  const fontSize = tableData.length > 6 ? 6 : 7;

  autoTable(doc, {
    startY: currentY,
    head: [["#", "Periode", "Montant"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [52, 73, 94],
      fontSize: fontSize,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 1.5
    },
    bodyStyles: {
      fontSize: fontSize,
      cellPadding: 1.5
    },
    columnStyles: {
      0: { cellWidth: 20, halign: "center" },
      1: { cellWidth: 55, halign: "center" },
      2: { cellWidth: 40, halign: "right" },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    tableWidth: pageWidth - 2 * margin
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // === BOX TOTAL ===
  doc.setFillColor(46, 204, 113);
  doc.rect(margin, currentY, pageWidth - 2 * margin, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", margin + 4, currentY + 7);
  doc.text(formatMontant(paiement.montant), pageWidth - margin - 4, currentY + 7, { align: "right" });
  doc.setTextColor(0, 0, 0);

  currentY += 14;

  // === RÉCAPITULATIF (si multi-mois) ===
  if (nombreMois > 1 && (paiement.type === "loyer" || paiement.type === "avance" || paiement.type === "arrieres")) {
    doc.setFillColor(240, 248, 255);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 10, "F");
    doc.setDrawColor(41, 128, 185);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 10);
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text("RESUME:", margin + 2, currentY + 4);
    doc.setTextColor(0, 0, 0);
    
    const startMois = paiement.mois_concerne ? new Date(paiement.mois_concerne) : new Date();
    const endMois = new Date(startMois);
    endMois.setMonth(endMois.getMonth() + nombreMois - 1);
    
    doc.setFont("helvetica", "normal");
    doc.text(`${nombreMois} mois | ${startMois.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })} → ${endMois.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}`, margin + 2, currentY + 8);
    doc.text(`${formatMontant(loyerMensuel)}/mois`, pageWidth - margin - 2, currentY + 8, { align: "right" });
    
    currentY += 13;
  }

  // === PROCHAIN PAIEMENT ===
  if ((paiement.type === "loyer" || paiement.type === "avance") && paiement.mois_concerne) {
    const nextMonth = new Date(paiement.mois_concerne);
    nextMonth.setMonth(nextMonth.getMonth() + nombreMois);
    nextMonth.setDate(10);

    doc.setFillColor(255, 248, 230);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 8, "F");
    doc.setDrawColor(255, 152, 0);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 8);
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 100, 0);
    doc.text("PROCHAIN PAIEMENT:", margin + 2, currentY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(`10 ${nextMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`, pageWidth - margin - 2, currentY + 5, { align: "right" });
    doc.setTextColor(0, 0, 0);
    currentY += 10;
  }

  // === NOTE CAUTION ===
  if (paiement.type === "caution") {
    doc.setFontSize(6);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("La caution sera restituee en fin de bail, deduction faite des eventuels dommages.", margin, currentY + 3);
    doc.setTextColor(0, 0, 0);
    currentY += 6;
  }

  // === NOTES ===
  if (paiement.notes) {
    doc.setFontSize(6);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(`Note: ${paiement.notes}`, margin, currentY + 2);
    doc.setTextColor(0, 0, 0);
  }

  // === PIED DE PAGE ===
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.text("Ce document fait foi de paiement. PANPAS IMMOBILIER", pageWidth / 2, pageHeight - 6, { align: "center" });

  // === SAUVEGARDE ===
  const fileName = `Facture_${paiement.locataire.nom.replace(/\s+/g, "_")}_${new Date(paiement.date_paiement).toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};

// Generate Professional Contract PDF - Format PANPAS with proper pagination
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
  const maxY = pageHeight - 25; // Leave space for footer
  let currentY = margin;

  // Get owner name
  const proprietaireNom = contrat.biens?.proprietaires?.nom || "Non renseigne";
  const proprietaireTel = contrat.biens?.proprietaires?.telephone || "";

  // Helper function to check and add new page if needed
  const checkNewPage = (neededSpace: number = 15) => {
    if (currentY + neededSpace > maxY) {
      // Add footer to current page
      addPageFooter();
      doc.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  // Helper function to add footer
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

  // Company Header
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

  // Decorative line
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  const titleType = contrat.biens?.type === "boutique" || contrat.biens?.type === "magasin" 
    ? "CONTRAT DE BAIL A USAGE COMMERCIAL" 
    : "CONTRAT DE BAIL A USAGE D'HABITATION";
  doc.text(titleType, pageWidth / 2, currentY, { align: "center" });
  
  currentY += 8;

  // ENTRE LES SOUSSIGNES
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("ENTRE LES SOUSSIGNES", margin, currentY);
  doc.setTextColor(0, 0, 0);
  currentY += 6;

  // Bailleur Section - Sans téléphone du propriétaire pour confidentialité
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

  // Preneur Section
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

  // Law reference
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text("Conformement aux dispositions du Code civil applicables au Togo.", margin, currentY);
  doc.setTextColor(0, 0, 0);
  currentY += 8;

  // ARTICLES
  const typeLabels: { [key: string]: string } = {
    maison: "Maison",
    boutique: "Boutique",
    chambre: "Chambre",
    magasin: "Magasin",
  };
  const typeBien = typeLabels[contrat.biens?.type] || contrat.biens?.type;

  // Article 1
  checkNewPage(25);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 1: Designation", margin, currentY);
  currentY += 5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${typeBien} - ${contrat.biens?.nom}`, margin + 5, currentY);
  currentY += 5;
  doc.text(`Adresse: ${contrat.biens?.adresse}`, margin + 5, currentY);
  currentY += 10;

  // Article 2
  checkNewPage(20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 2: Objet", margin, currentY);
  currentY += 5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const usage = contrat.biens?.type === "boutique" || contrat.biens?.type === "magasin" ? "Usage commercial" : "Usage d'habitation";
  doc.text(usage, margin + 5, currentY);
  currentY += 10;

  // Article 3
  checkNewPage(30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 3: Etat des lieux", margin, currentY);
  currentY += 5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("a- Etat des locaux: interieur en bon etat de fonctionnement.", margin + 5, currentY);
  currentY += 5;
  doc.text("b- Nombre de cles remises: selon inventaire.", margin + 5, currentY);
  currentY += 5;
  doc.text("c- Equipements existants: selon etat des lieux d'entree.", margin + 5, currentY);
  currentY += 10;

  // Article 4
  checkNewPage(25);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 4: Duree et prise d'effet", margin, currentY);
  currentY += 5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const duree = contrat.date_fin ? `Du ${new Date(contrat.date_debut).toLocaleDateString("fr-FR")} au ${new Date(contrat.date_fin).toLocaleDateString("fr-FR")}` : "Duree indeterminee";
  doc.text(`a- Duree: ${duree}`, margin + 5, currentY);
  currentY += 5;
  doc.text(`b- Prise d'effet: ${new Date(contrat.date_debut).toLocaleDateString("fr-FR")}`, margin + 5, currentY);
  currentY += 10;

  // Article 5 - Conditions financieres
  checkNewPage(35);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 5: Conditions financieres", margin, currentY);
  currentY += 5;
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
  checkNewPage(35);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 6: Obligations du preneur", margin, currentY);
  currentY += 5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const obligations = [
    "- Entretenir et maintenir les locaux en bon etat",
    "- Payer le loyer a la date convenue",
    "- Informer le bailleur de toute reparation necessaire",
    "- Ne pas sous-louer sans accord ecrit du bailleur"
  ];
  obligations.forEach((o) => {
    checkNewPage(8);
    doc.text(o, margin + 5, currentY);
    currentY += 5;
  });
  currentY += 5;

  // Article 7
  checkNewPage(25);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 7: Resiliation et preavis", margin, currentY);
  currentY += 5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("La resiliation de ce bail par une partie est obligatoirement precedee d'un preavis de 3 mois.", margin + 5, currentY);
  currentY += 5;
  doc.text("A defaut, le concerne s'engage a payer une indemnite d'un (01) mois de loyer.", margin + 5, currentY);
  currentY += 10;

  // Article 8
  checkNewPage(30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 8: Fin du bail", margin, currentY);
  currentY += 5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("A la fin du bail, le preneur s'engage a:", margin + 5, currentY);
  currentY += 5;
  doc.text("- Remettre les locaux dans l'etat initial", margin + 5, currentY);
  currentY += 5;
  doc.text("- Restituer toutes les cles", margin + 5, currentY);
  currentY += 5;
  doc.text("- La caution sera restituee apres verification de l'etat des lieux", margin + 5, currentY);
  currentY += 15;

  // Signatures section - check if we need new page for signatures
  checkNewPage(70);
  
  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fait a Kara, le ${new Date(contrat.date_debut).toLocaleDateString("fr-FR")}`, margin, currentY);
  currentY += 12;

  // Tableau des signatures agrandi
  const signatureTableHeight = 45;
  const colWidth = contentWidth / 2;
  
  // Bordure du tableau
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, currentY, contentWidth, signatureTableHeight);
  doc.line(margin + colWidth, currentY, margin + colWidth, currentY + signatureTableHeight);

  // En-têtes
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("LE PRENEUR", margin + colWidth / 2, currentY + 8, { align: "center" });
  doc.text("LE BAILLEUR", margin + colWidth + colWidth / 2, currentY + 8, { align: "center" });
  
  // Noms
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(contrat.locataires?.nom || "", margin + colWidth / 2, currentY + 15, { align: "center" });
  doc.text("AGENCE IMMOBILIERE PANPAS", margin + colWidth + colWidth / 2, currentY + 15, { align: "center" });
  
  // Labels signature
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("(Signature)", margin + colWidth / 2, currentY + signatureTableHeight - 5, { align: "center" });
  doc.text("(Signature et cachet)", margin + colWidth + colWidth / 2, currentY + signatureTableHeight - 5, { align: "center" });
  doc.setTextColor(0, 0, 0);

  currentY += signatureTableHeight + 15;

  // FIN DU BAIL section - check if enough space or add new page
  if (currentY + 60 > maxY) {
    addPageFooter();
    doc.addPage();
    currentY = margin;
  }

  // Tableau FIN DU BAIL agrandi
  const finBailHeight = 55;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, currentY, contentWidth, finBailHeight);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("FIN DU BAIL", pageWidth / 2, currentY + 8, { align: "center" });
  
  // Lignes de séparation
  doc.setLineWidth(0.3);
  doc.line(margin, currentY + 12, margin + contentWidth, currentY + 12);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Liquidation: ___________________________________", margin + 5, currentY + 20);
  doc.text("Montant restant apres liquidation: _______________", margin + 5, currentY + 28);
  doc.text("Date de reprise des cles: _______________________", margin + 5, currentY + 36);
  doc.text("Reserves: _____________________________________", margin + 5, currentY + 44);
  
  // Signatures fin de bail
  const sigColWidth = contentWidth / 3;
  doc.line(margin, currentY + finBailHeight - 15, margin + contentWidth, currentY + finBailHeight - 15);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("LOCATAIRE", margin + sigColWidth / 2, currentY + finBailHeight - 10, { align: "center" });
  doc.text("AGENCE", margin + sigColWidth + sigColWidth / 2, currentY + finBailHeight - 10, { align: "center" });
  doc.text("BAILLEUR", margin + 2 * sigColWidth + sigColWidth / 2, currentY + finBailHeight - 10, { align: "center" });
  
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("(Signature)", margin + sigColWidth / 2, currentY + finBailHeight - 3, { align: "center" });
  doc.text("(Signature et cachet)", margin + sigColWidth + sigColWidth / 2, currentY + finBailHeight - 3, { align: "center" });
  doc.text("(Signature)", margin + 2 * sigColWidth + sigColWidth / 2, currentY + finBailHeight - 3, { align: "center" });

  // Add footer to last page
  addPageFooter();

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
