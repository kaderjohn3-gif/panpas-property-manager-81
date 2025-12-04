import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
}

// Format number with separators and FCFA - safe encoding
const formatMontant = (montant: number): string => {
  const formatted = new Intl.NumberFormat('fr-FR').format(montant);
  return formatted + " FCFA";
};

// Generate receipt number: PANPAS001/MM/YY
const generateReceiptNumber = (paiementId: string, date: string): string => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  // Use first 3 digits of UUID as sequence
  const seq = parseInt(paiementId.replace(/-/g, '').slice(0, 6), 16) % 999 + 1;
  const seqStr = String(seq).padStart(3, '0');
  return `PANPAS${seqStr}/${month}/${year}`;
};

export const generateReceiptPDF = async (paiement: PaiementData, logoBase64?: string) => {
  // Format demi-page A4 (A6) pour imprimer 2 reçus par page
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [148, 105], // A6 landscape (demi A4)
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;

  // Logo et En-tête compact
  let currentY = margin;
  
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", margin, currentY, 15, 15);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }

  // Company Header - Compact
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PANPAS IMMOBILIER", logoBase64 ? margin + 18 : margin, currentY + 5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Gestion Immobilière Professionnelle", logoBase64 ? margin + 18 : margin, currentY + 9);
  
  // Contact info
  doc.setFontSize(6.5);
  doc.text("Tél: +228 92 18 40 65", logoBase64 ? margin + 18 : margin, currentY + 12.5);
  doc.text("Web: www.panpasimmobilier.tech", logoBase64 ? margin + 18 : margin, currentY + 15.5);

  // Receipt Title - Compact
  currentY += 22;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("REÇU DE PAIEMENT", pageWidth / 2, currentY, { align: "center" });

  // Reset text color
  doc.setTextColor(0, 0, 0);
  currentY += 2;

  // Receipt Details - Compact
  currentY += 5;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");

  const receiptNumber = generateReceiptNumber(paiement.id, paiement.date_paiement);
  
  const details = [
    { label: "N° Reçu:", value: receiptNumber },
    { label: "Date:", value: new Date(paiement.date_paiement).toLocaleDateString("fr-FR") },
    {
      label: "Type:",
      value:
        paiement.type === "loyer"
          ? "Loyer"
          : paiement.type === "avance"
            ? "Avance"
            : "Caution",
    },
  ];

  details.forEach((detail) => {
    doc.setFont("helvetica", "bold");
    doc.text(detail.label, margin, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(detail.value, margin + 20, currentY);
    currentY += 4.5;
  });

  // Separator line
  currentY += 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // Tenant Information - Compact
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("LOCATAIRE", margin, currentY);
  currentY += 4;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Nom: ${paiement.locataire.nom}`, margin, currentY);
  currentY += 4;

  if (paiement.locataire.telephone) {
    doc.text(`Tél: ${paiement.locataire.telephone}`, margin, currentY);
    currentY += 4;
  }

  if (paiement.locataire.email) {
    doc.text(`Email: ${paiement.locataire.email}`, margin, currentY);
    currentY += 4;
  }

  currentY += 2;

  // Property Information - Compact
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("BIEN IMMOBILIER", margin, currentY);
  currentY += 4;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Désignation: ${paiement.bien.nom}`, margin, currentY);
  currentY += 4;

  doc.text(`Adresse: ${paiement.bien.adresse}`, margin, currentY);
  currentY += 4;

  const typeLabels = {
    maison: "Maison",
    boutique: "Boutique",
    chambre: "Chambre",
    magasin: "Magasin",
  };
  doc.text(
    `Type: ${typeLabels[paiement.bien.type as keyof typeof typeLabels] || paiement.bien.type}`,
    margin,
    currentY,
  );
  currentY += 5;

  // Payment Details Table - Compact with smaller fonts
  autoTable(doc, {
    startY: currentY,
    head: [["Description", "Montant"]],
    body: [
      [
        paiement.type === "loyer" && paiement.mois_concerne
          ? `Loyer ${new Date(paiement.mois_concerne).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`
          : paiement.type === "avance"
            ? "Avance sur loyer"
            : "Depot de garantie (Caution)",
        formatMontant(paiement.montant),
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      fontSize: 6.5,
      fontStyle: "bold",
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 6.5,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 50, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // Next payment due (for rent only) - FIXÉ AU 10 DU MOIS
  if (paiement.type === "loyer" && paiement.mois_concerne) {
    const nextMonth = new Date(paiement.mois_concerne);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(10);

    doc.setFillColor(240, 248, 255);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 8, "F");

    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text("Prochain paiement du:", margin + 2, currentY + 3);

    doc.setFont("helvetica", "normal");
    doc.text(
      `Le 10 ${nextMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`,
      margin + 2,
      currentY + 6,
    );

    currentY += 10;
  }

  // Total Section - Compact
  doc.setFillColor(41, 128, 185);
  doc.rect(margin, currentY, pageWidth - 2 * margin, 9, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL PAYE:", margin + 3, currentY + 5.5);

  doc.setFontSize(8);
  doc.text(formatMontant(paiement.montant), pageWidth - margin - 3, currentY + 5.5, {
    align: "right",
  });

  currentY += 11;

  // Footer - Compact
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "italic");
  doc.text(
    "Ce reçu fait foi de paiement. Merci pour votre confiance.",
    pageWidth / 2,
    pageHeight - 5,
    { align: "center" },
  );

  // Save the PDF
  doc.save(
    `Recu_${paiement.locataire.nom.replace(/\s+/g, "_")}_${new Date(paiement.date_paiement).toISOString().split("T")[0]}.pdf`,
  );
};

// Generate Professional Contract PDF
export const generateContratPDF = async (contrat: any, logoBase64?: string) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let currentY = margin;

  // Logo et En-tête
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
  doc.text("Gestion Immobilière Professionnelle", logoBase64 ? margin + 30 : margin, currentY + 14);
  doc.text("Tél: +228 92 18 40 65 | www.panpasimmobilier.tech", logoBase64 ? margin + 30 : margin, currentY + 19);

  currentY += 35;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("CONTRAT DE LOCATION", pageWidth / 2, currentY, { align: "center" });
  
  currentY += 15;
  doc.setTextColor(0, 0, 0);

  // Contract Number and Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`N° Contrat: ${contrat.id.slice(0, 8).toUpperCase()}`, margin, currentY);
  doc.text(
    `Date: ${new Date(contrat.date_debut).toLocaleDateString("fr-FR")}`,
    pageWidth - margin,
    currentY,
    { align: "right" }
  );

  currentY += 12;

  // Parties Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ENTRE LES SOUSSIGNÉS:", margin, currentY);
  currentY += 8;

  // Bailleur (PANPAS)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Le Bailleur:", margin, currentY);
  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.text("PANPAS IMMOBILIER", margin + 5, currentY);
  currentY += 5;
  doc.text("Représenté par son mandataire", margin + 5, currentY);
  currentY += 5;
  doc.text("Tél: +228 92 18 40 65", margin + 5, currentY);

  currentY += 10;

  // Locataire
  doc.setFont("helvetica", "bold");
  doc.text("Le Locataire:", margin, currentY);
  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`${contrat.locataires?.nom}`, margin + 5, currentY);
  currentY += 5;
  doc.text(`Téléphone: ${contrat.locataires?.telephone}`, margin + 5, currentY);
  if (contrat.locataires?.email) {
    currentY += 5;
    doc.text(`Email: ${contrat.locataires?.email}`, margin + 5, currentY);
  }
  if (contrat.locataires?.adresse) {
    currentY += 5;
    doc.text(`Adresse: ${contrat.locataires?.adresse}`, margin + 5, currentY);
  }

  currentY += 12;

  // Objet du contrat
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("OBJET DU CONTRAT:", margin, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const objetText = `Le Bailleur loue au Locataire le bien suivant:`;
  doc.text(objetText, margin, currentY);
  currentY += 7;

  doc.text(`• Désignation: ${contrat.biens?.nom}`, margin + 5, currentY);
  currentY += 5;
  doc.text(`• Type: ${contrat.biens?.type}`, margin + 5, currentY);
  currentY += 5;
  doc.text(`• Adresse: ${contrat.biens?.adresse}`, margin + 5, currentY);

  currentY += 12;

  // Conditions financières
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CONDITIONS FINANCIÈRES:", margin, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`• Loyer mensuel: ${formatMontant(contrat.loyer_mensuel)}`, margin + 5, currentY);
  currentY += 5;
  doc.text(`• Dépôt de garantie (Caution): ${formatMontant(contrat.caution)}`, margin + 5, currentY);
  if (contrat.avance_mois > 0) {
    currentY += 5;
    doc.text(`• Avance: ${contrat.avance_mois} mois de loyer`, margin + 5, currentY);
  }
  currentY += 5;
  doc.text(`• Paiement: Le 10 de chaque mois`, margin + 5, currentY);

  currentY += 12;

  // Durée du contrat
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("DURÉE DU CONTRAT:", margin, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `• Date de début: ${new Date(contrat.date_debut).toLocaleDateString("fr-FR")}`,
    margin + 5,
    currentY
  );
  if (contrat.date_fin) {
    currentY += 5;
    doc.text(
      `• Date de fin: ${new Date(contrat.date_fin).toLocaleDateString("fr-FR")}`,
      margin + 5,
      currentY
    );
  } else {
    currentY += 5;
    doc.text(`• Durée: Indéterminée`, margin + 5, currentY);
  }

  currentY += 12;

  // Clauses importantes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CLAUSES IMPORTANTES:", margin, currentY);
  currentY += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const clauses = [
    "Le Locataire s'engage à payer le loyer à la date convenue.",
    "Le Locataire s'engage à entretenir le bien en bon état.",
    "Toute sous-location est interdite sans accord écrit du Bailleur.",
    "Le Locataire doit informer le Bailleur de toute réparation nécessaire.",
    "Le dépôt de garantie sera restitué en fin de contrat, déduction faite des éventuels dommages.",
  ];

  clauses.forEach((clause) => {
    const lines = doc.splitTextToSize(`• ${clause}`, pageWidth - 2 * margin - 5);
    doc.text(lines, margin + 5, currentY);
    currentY += lines.length * 5;
  });

  currentY += 15;

  // Signatures
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  
  const sigY = currentY;
  doc.text("Le Bailleur", margin + 20, sigY);
  doc.text("Le Locataire", pageWidth - margin - 40, sigY);
  
  // Signature lines
  doc.line(margin, sigY + 20, margin + 60, sigY + 20);
  doc.line(pageWidth - margin - 60, sigY + 20, pageWidth - margin, sigY + 20);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`(Signature et date)`, margin + 10, sigY + 25);
  doc.text(`(Signature et date)`, pageWidth - margin - 50, sigY + 25);

  // Footer
  currentY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Document généré le ${new Date().toLocaleDateString("fr-FR")} par PANPAS IMMOBILIER`,
    pageWidth / 2,
    currentY,
    { align: "center" }
  );

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
  const margin = 15;
  let currentY = margin;

  // Logo et En-tête
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", margin, currentY, 20, 20);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("PANPAS IMMOBILIER", logoBase64 ? margin + 25 : margin, currentY + 6);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("Rapport Financier Mensuel", logoBase64 ? margin + 25 : margin, currentY + 12);

  currentY += 25;

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("RAPPORT FINANCIER", pageWidth / 2, currentY, { align: "center" });
  
  currentY += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  const monthDate = new Date(selectedMonth + "-01");
  doc.text(
    monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).toUpperCase(),
    pageWidth / 2,
    currentY,
    { align: "center" }
  );

  currentY += 15;

  // Summary Box
  doc.setFillColor(240, 248, 255);
  doc.rect(margin, currentY, pageWidth - 2 * margin, 30, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("RÉSUMÉ GÉNÉRAL", margin + 5, currentY + 7);

  currentY += 12;
  doc.setFont("helvetica", "normal");
  doc.text(`Revenus totaux:`, margin + 5, currentY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 128, 0);
  doc.text(formatMontant(financialData.totals.revenus), pageWidth - margin - 5, currentY, {
    align: "right",
  });

  currentY += 7;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(`Dépenses totales:`, margin + 5, currentY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 0, 0);
  doc.text(formatMontant(financialData.totals.depenses), pageWidth - margin - 5, currentY, {
    align: "right",
  });

  currentY += 7;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(`Bénéfice net:`, margin + 5, currentY);
  doc.setFont("helvetica", "bold");
  const beneficeColor = financialData.totals.benefice >= 0 ? [0, 128, 0] : [255, 0, 0];
  doc.setTextColor(beneficeColor[0], beneficeColor[1], beneficeColor[2]);
  doc.text(formatMontant(financialData.totals.benefice), pageWidth - margin - 5, currentY, {
    align: "right",
  });

  // Calculate PANPAS commission (10% of revenues)
  const commissionPanpas = financialData.totals.revenus * 0.1;
  currentY += 7;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text(`Commission PANPAS (10%):`, margin + 5, currentY);
  doc.text(formatMontant(commissionPanpas), pageWidth - margin - 5, currentY, {
    align: "right",
  });

  currentY += 15;
  doc.setTextColor(0, 0, 0);

  // Details by owner
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("DÉTAILS PAR PROPRIÉTAIRE", margin, currentY);

  currentY += 8;

  // Table
  autoTable(doc, {
    startY: currentY,
    head: [["Propriétaire", "Revenus", "Dépenses", "Bénéfice"]],
    body: financialData.byProprietaire.map((prop: any) => [
      prop.nom,
      formatMontant(prop.revenus),
      formatMontant(prop.depenses),
      formatMontant(prop.benefice),
    ]),
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      fontSize: 10,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 40, halign: "right" },
      2: { cellWidth: 40, halign: "right" },
      3: { cellWidth: 40, halign: "right" },
    },
  });

  // Footer
  currentY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "italic");
  doc.text(
    `Rapport généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`,
    pageWidth / 2,
    currentY,
    { align: "center" }
  );
  doc.text("PANPAS IMMOBILIER - Gestion Professionnelle", pageWidth / 2, currentY + 4, {
    align: "center",
  });

  // Save
  doc.save(`Rapport_Financier_${selectedMonth}.pdf`);
};

// Convert image to base64
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
