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

  const details = [
    { label: "N° Reçu:", value: `#${paiement.id.slice(0, 8).toUpperCase()}` },
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

  // Payment Details Table - Compact
  autoTable(doc, {
    startY: currentY,
    head: [["Description", "Montant"]],
    body: [
      [
        paiement.type === "loyer" && paiement.mois_concerne
          ? `Loyer ${new Date(paiement.mois_concerne).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`
          : paiement.type === "avance"
            ? "Avance sur loyer"
            : "Dépôt de garantie (Caution)",
        `${paiement.montant.toLocaleString("fr-FR")} FCFA`,
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      fontSize: 7.5,
      fontStyle: "bold",
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // Next payment due (for rent only) - FIXÉ AU 10 DU MOIS
  if (paiement.type === "loyer" && paiement.mois_concerne) {
    const nextMonth = new Date(paiement.mois_concerne);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(10); // Fixer la date au 10 du mois

    doc.setFillColor(240, 248, 255);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 10, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Prochain paiement dû:", margin + 2, currentY + 4);

    doc.setFont("helvetica", "normal");
    doc.text(
      `Le 10 ${nextMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`,
      margin + 2,
      currentY + 7.5,
    );

    currentY += 12;
  }

  // Total Section - Compact
  doc.setFillColor(41, 128, 185);
  doc.rect(margin, currentY, pageWidth - 2 * margin, 10, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL PAYÉ:", margin + 3, currentY + 6.5);

  doc.setFontSize(10);
  doc.text(`${paiement.montant.toLocaleString("fr-FR")} FCFA`, pageWidth - margin - 3, currentY + 6.5, {
    align: "right",
  });

  currentY += 12;

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
