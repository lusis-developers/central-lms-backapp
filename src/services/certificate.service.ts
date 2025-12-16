import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export class CertificateService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), "temp", "certificates");
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async generateCertificate(
    studentName: string,
    courseName: string,
    date: Date,
    certificateId: string
  ): Promise<string> {
    // Ensure directory exists before generating
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ layout: "landscape", size: "A4" });
      const fileName = `certificate-${certificateId}.pdf`;
      const filePath = path.join(this.tempDir, fileName);

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Background
      doc.rect(0, 0, doc.page.width, doc.page.height).fill("#f9f9f9");
      
      // Border
      doc.lineWidth(10);
      doc.strokeColor("#2c3e50");
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke();

      // Logo
      const logoPath = path.join(process.cwd(), "src", "static", "logo-fudmaster.png");
      if (fs.existsSync(logoPath)) {
        const logoWidth = 200;
        const logoX = (doc.page.width - logoWidth) / 2;
        doc.image(logoPath, logoX, 40, { width: logoWidth });
      }

      // Content with Absolute Positioning to ensure single page
      const centerX = 0;
      const pageWidth = doc.page.width;

      doc.fillColor("#2c3e50").fontSize(40).font("Helvetica-Bold").text("CERTIFICADO DE FINALIZACIÓN", centerX, 140, { align: "center", width: pageWidth });
      
      doc.fillColor("#7f8c8d").fontSize(20).font("Helvetica").text("Se certifica que", centerX, 190, { align: "center", width: pageWidth });
      
      doc.fillColor("#2c3e50").fontSize(35).font("Helvetica-Bold").text(studentName, centerX, 220, { align: "center", width: pageWidth });
      
      doc.fillColor("#7f8c8d").fontSize(20).font("Helvetica").text("ha completado con éxito el curso", centerX, 270, { align: "center", width: pageWidth });
      
      doc.fillColor("#e67e22").fontSize(30).font("Helvetica-Bold").text(courseName, centerX, 300, { align: "center", width: pageWidth });
      
      doc.fillColor("#7f8c8d").fontSize(15).font("Helvetica").text(`Fecha: ${date.toLocaleDateString("es-ES")}`, centerX, 350, { align: "center", width: pageWidth });
      
      // Signatures - Positioned below the date
      const signatureY = 400;
      const signatureWidth = 120;
      
      // Luis Signature (Left)
      const luisSignaturePath = path.join(process.cwd(), "src", "static", "signatures", "luis", "luis-signature.png");
      if (fs.existsSync(luisSignaturePath)) {
        const luisX = (pageWidth / 4) - (signatureWidth / 2);
        doc.image(luisSignaturePath, luisX, signatureY, { width: signatureWidth });
        
        doc.fillColor("#2c3e50").fontSize(12).font("Helvetica-Bold").text("Luis Reyes", luisX, signatureY + 60, { width: signatureWidth, align: "center" });
        doc.fillColor("#7f8c8d").fontSize(10).font("Helvetica").text("CEO FudMasters", luisX, signatureY + 75, { width: signatureWidth, align: "center" });
      }

      // Mauro Signature (Right)
      const mauroSignaturePath = path.join(process.cwd(), "src", "static", "signatures", "mauro", "mauro-signature.png");
      if (fs.existsSync(mauroSignaturePath)) {
        const mauroX = (pageWidth * 3 / 4) - (signatureWidth / 2);
        doc.image(mauroSignaturePath, mauroX, signatureY, { width: signatureWidth });
        
        doc.fillColor("#2c3e50").fontSize(12).font("Helvetica-Bold").text("Mauro Reyes", mauroX, signatureY + 60, { width: signatureWidth, align: "center" });
        doc.fillColor("#7f8c8d").fontSize(10).font("Helvetica").text("COO FudMasters", mauroX, signatureY + 75, { width: signatureWidth, align: "center" });
      }

      // Footer
      doc.fillColor("#95a5a6").fontSize(12).text("FudMasters Institute", centerX, 530, { align: "center", width: pageWidth });

      // Professional Seal
      doc.save();
      const sealX = doc.page.width - 100;
      const sealY = doc.page.height - 100;
      
      // Outer jagged circle (simplified as a thick stroke circle for now)
      doc.lineWidth(2);
      doc.strokeColor("#d35400"); // Darker orange
      doc.fillColor("#f1c40f"); // Gold
      doc.circle(sealX, sealY, 45).fillAndStroke();
      
      // Inner ring
      doc.strokeColor("#e67e22");
      doc.circle(sealX, sealY, 38).stroke();
      
      // Text inside seal
      doc.fillColor("#d35400");
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("OFICIAL", sealX - 20, sealY - 12);
      doc.text("CERTIFICADO", sealX - 32, sealY + 2);
      
      doc.restore();

      doc.end();

      stream.on("finish", () => {
        resolve(filePath);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    });
  }

  deleteCertificateFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export const certificateService = new CertificateService();
