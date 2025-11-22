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
  };
  contrat: {
    loyer_mensuel: number;
  };
}

export const generateReceiptPDF = async (paiement: PaiementData, logoBase64?: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [37, 99, 235]; // Blue
  const grayColor: [number, number, number] = [107, 114, 128];
  
  // Add logo if provided
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", 15, 10, 30, 30);
    } catch (error) {
      console.error("Error adding logo:", error);
    }
  }
  
  // Header - Company Info
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("PANPAS IMMOBILIER", logoBase64 ? 50 : 15, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.setFont("helvetica", "normal");
  doc.text("Gestion Immobilière Professionnelle", logoBase64 ? 50 : 15, 27);
  doc.text("Kara, Togo", logoBase64 ? 50 : 15, 32);
  doc.text("Tél: +228 XX XX XX XX", logoBase64 ? 50 : 15, 37);
  
  // Receipt number and date
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  const receiptNumber = `RECU-${paiement.id.slice(0, 8).toUpperCase()}`;
  doc.text(receiptNumber, pageWidth - 15, 20, { align: "right" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  const formattedDate = new Date(paiement.date_paiement).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(`Date: ${formattedDate}`, pageWidth - 15, 27, { align: "right" });
  
  // Title
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("REÇU DE PAIEMENT", pageWidth / 2, 55, { align: "center" });
  
  // Line separator
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(15, 60, pageWidth - 15, 60);
  
  // Tenant Information
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Reçu de:", 15, 75);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(paiement.locataire.nom, 15, 82);
  doc.text(`Tél: ${paiement.locataire.telephone}`, 15, 87);
  if (paiement.locataire.email) {
    doc.text(`Email: ${paiement.locataire.email}`, 15, 92);
  }
  if (paiement.locataire.adresse) {
    doc.text(`Adresse: ${paiement.locataire.adresse}`, 15, 97);
  }
  
  // Property Information
  doc.setFont("helvetica", "bold");
  doc.text("Pour le bien:", pageWidth / 2 + 10, 75);
  
  doc.setFont("helvetica", "normal");
  doc.text(paiement.bien.nom, pageWidth / 2 + 10, 82);
  doc.text(paiement.bien.adresse, pageWidth / 2 + 10, 87, { maxWidth: pageWidth / 2 - 25 });
  
  // Payment Details Table
  const yStart = paiement.locataire.adresse ? 110 : 105;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Détails du paiement", 15, yStart);
  
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      loyer: "Loyer",
      avance: "Avance",
      caution: "Caution",
    };
    return labels[type] || type;
  };
  
  const tableData: any[] = [
    ["Type de paiement", getTypeLabel(paiement.type)],
    ["Montant payé", `${paiement.montant.toLocaleString()} FCFA`],
  ];
  
  if (paiement.type === "loyer" && paiement.mois_concerne) {
    const moisConcerne = new Date(paiement.mois_concerne).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
    tableData.push(["Mois concerné", moisConcerne]);
  }
  
  tableData.push(["Date de paiement", formattedDate]);
  
  if (paiement.notes) {
    tableData.push(["Notes", paiement.notes]);
  }
  
  autoTable(doc, {
    startY: yStart + 5,
    head: [],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 60 },
      1: { cellWidth: "auto" },
    },
  });
  
  // Calculate next payment due date (if it's a monthly rent)
  let finalY = (doc as any).lastAutoTable.finalY + 15;
  
  if (paiement.type === "loyer") {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    
    const nextDueDate = new Date(paiement.date_paiement);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    const formattedNextDate = nextDueDate.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    
    doc.text(`Prochaine échéance: ${formattedNextDate}`, 15, finalY);
    doc.text(`Montant: ${paiement.contrat.loyer_mensuel.toLocaleString()} FCFA`, 15, finalY + 6);
    
    finalY += 20;
  }
  
  // Total Amount Box
  doc.setFillColor(...primaryColor);
  doc.rect(pageWidth - 75, finalY, 60, 15, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL PAYÉ", pageWidth - 45, finalY + 6, { align: "center" });
  doc.setFontSize(14);
  doc.text(`${paiement.montant.toLocaleString()} FCFA`, pageWidth - 45, finalY + 12, { align: "center" });
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 30;
  
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
  
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  doc.setFont("helvetica", "italic");
  doc.text("Signature & Cachet", pageWidth - 15, footerY, { align: "right" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    "Ce reçu certifie le paiement mentionné ci-dessus. Merci de votre confiance.",
    pageWidth / 2,
    footerY + 8,
    { align: "center" }
  );
  
  doc.text(
    "PANPAS Immobilier - Tous droits réservés",
    pageWidth / 2,
    footerY + 13,
    { align: "center" }
  );
  
  // Save the PDF
  doc.save(`Recu_${receiptNumber}_${paiement.locataire.nom.replace(/\s+/g, "_")}.pdf`);
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
